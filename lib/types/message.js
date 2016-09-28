'use strict';
var DescribedType = require('./described_type'),
    ForcedType = require('./forced_type'),

    u = require('../utilities'),
    wrapField = require('./composite_type').wrapField,
    errors = require('../errors'),
    codec = require('../codec');

var sectionByDescriptor = {},
    sectionByProperty = {};

function defineSection(descriptor, definition) {
  sectionByDescriptor[descriptor.code] = definition;
  sectionByDescriptor[descriptor.name] = definition;
}

function defineMapSection(definition) {
  var descriptor = { name: 'amqp:' + definition.name + ':map', code: definition.code };
  var property = u.camelCase(definition.name);
  var sectionDefinition = {
    descriptor: definition.code, source: !!definition.source ? definition.source : 'map',
    decode: function(message, described) {
      message[property] = described.value;
    }
  };

  defineSection(descriptor, sectionDefinition);
  sectionByProperty[property] = sectionDefinition;
}

function defineCompositeSection(definition) {
  var descriptor = { name: 'amqp:' + definition.name + ':list', code: definition.code };
  var sectionDefinition = {
    descriptor: definition.code,
    encode: function(value, buffer) {
      var _len = definition.fields.length, result = [];
      for (var i = 0; i < _len; ++i) {
        var field = definition.fields[i];
        result[i] = wrapField(field, value[field.name]);
      }

      return result;
    },
    decode: function(message, described) {
      var _len = definition.fields.length, data = {};
      for (var i = 0; i < _len; ++i) {
        var field = definition.fields[i];
        data[field.name] = described.value[i];
      }

      message[definition.name] = data;
    }
  };

  defineSection(descriptor, sectionDefinition);
  sectionByProperty[definition.name] = sectionDefinition;
}

var isData = function(x) { return x instanceof Buffer; };
defineSection({ code: 0x75, name: 'amqp:data:binary' }, {
  encode: null,
  decode: function(message, described) {
    if (!message.hasOwnProperty('body')) message.body = [];
    else if (!Array.isArray(message.body) || !message.body.every(isData)) {
      throw new errors.MalformedPayloadError('Attempt to put both Data and non-Data payloads in message body');
    }

    message.body.push(described.value);
  }
});

var isSequence = function(x) { return Array.isArray(x); };
defineSection({ code: 0x76, name: 'amqp:amqp-sequence:list' }, {
  encode: null,
  decode: function(message, described) {
    if (!message.hasOwnProperty('body')) message.body = [];
    else if (!Array.isArray(message.body) || !message.body.every(isSequence)) {
      throw new errors.MalformedPayloadError('Attempt to put both AMQPSequence and non-AMQPSequence payloads in message body');
    }

    message.body.push(described.value);
  }
});

defineSection({ code: 0x77, name: 'amqp:value:*' }, {
  encode: null,
  decode: function(message, described) {
    if (message.body && Array.isArray(message.body)) {
      throw new errors.MalformedPayloadError('Attempt to provide more than one AMQPValue for message body');
    }

    message.body = described.value;
  }
});

defineCompositeSection({
  name: 'header', code: 0x70,
  fields: [
    { name: 'durable', type: 'boolean', default: false },
    { name: 'priority', type: 'ubyte', default: 4 },
    { name: 'ttl', type: 'milliseconds' },
    { name: 'firstAcquirer', type: 'boolean', default: false },
    { name: 'deliveryCount', type: 'uint', default: 0 }
  ]
});

defineCompositeSection({
  name: 'properties', code: 0x73,
  fields: [
    { name: 'messageId', type: '*' },         // @spec type: `*` requires: `message-id` => various values
    { name: 'userId', type: 'binary' },
    { name: 'to', type: 'address' },
    { name: 'subject', type: 'string' },
    { name: 'replyTo', type: 'address' },
    { name: 'correlationId', type: '*' },     // @spec type: `*` requires: `message-id` => various values
    { name: 'contentType', type: 'symbol' },
    { name: 'contentEncoding', type: 'symbol' },
    { name: 'absoluteExpiryTime', type: 'timestamp' },
    { name: 'creationTime', type: 'timestamp' },
    { name: 'groupId', type: 'string' },
    { name: 'groupSequence', type: 'sequence-no' },
    { name: 'replyToGroupId', type: 'string' }
  ]
});

defineMapSection({ name: 'delivery-annotations', code: 0x71, source: 'fields' });
defineMapSection({ name: 'message-annotations', code: 0x72, source: 'fields' });
defineMapSection({ name: 'application-properties', code: 0x74, source: 'map' });
defineMapSection({ name: 'footer', code: 0x78 , source: 'map' });

module.exports.decodeMessage = function(buffer) {
  var message = {};
  var curIdx = 0;
  while (curIdx < buffer.length) {
    var decoded = codec.decode(buffer, curIdx);
    if (!decoded) {
      throw new errors.MalformedPayloadError('Unable to decode bytes from message body: ' + buffer.slice(curIdx).toString('hex'));
    }

    var described = decoded[0];
    if (!sectionByDescriptor.hasOwnProperty(described.descriptor)) {
      throw new errors.MalformedPayloadError('Unknown section: ', described);
    }

    var sectionDefinition = sectionByDescriptor[described.descriptor];
    curIdx += decoded[1];

    sectionDefinition.decode(message, described);
  }

  if (Array.isArray(message.body) && message.body.length === 1)
    message.body = message.body[0];
  return message;
};

module.exports.encodeMessage = function(message, buffer) {
  var _keys = Object.keys(sectionByProperty), _len = _keys.length;
  for (var i = 0; i < _len; ++i) {
    var property = _keys[i], definition = sectionByProperty[property];
    if (message.hasOwnProperty(property)) {
      var section = message[property];
      if (definition.encode && typeof definition.encode === 'function') {
        section = definition.encode(section);
      }

      var value = definition.hasOwnProperty('source') ?
        new ForcedType(definition.source, section) : section;
      var described = new DescribedType(definition.descriptor, value);
      codec.encode(described, buffer);
    }
  }

  if (!!message.body || u.isNumber(message.body)) {
    // @todo:
    //  Array[Buffer] => multiple Data segments
    //  Array[Array] => multiple AMQPSequence
    if (message.body instanceof DescribedType) {
      var descriptor = message.body.descriptor;
      if (!u.includes([0x75, 0x76, 0x77], descriptor)) {
        throw new errors.MalformedPayloadError(
            'Invalid described type for message body: ', descriptor);
      }
      codec.encode(message.body, buffer);
    } else if (message.body instanceof Buffer) {
      codec.encode(new DescribedType(0x75, message.body), buffer);  // Data
    } else if (Array.isArray(message.body)) {
      codec.encode(new DescribedType(0x76, message.body), buffer);  // AMQPSequence
    } else {
      codec.encode(new DescribedType(0x77, message.body), buffer);  // AMQPValue
    }
  }

  return buffer;
};
