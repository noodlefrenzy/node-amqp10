'use strict';

var util = require('util'),

    AMQPFields = require('./amqp_composites').Fields,
    DescribedType = require('./described_type'),
    ForcedType = require('./forced_type'),

    u = require('../utilities'),
    errors = require('../errors');

/**
 *
 * @param options
 * @constructor
 */
function Header(options) {
  Header.super_.call(this, Header);

  u.assignDefined(this, options, {
    durable: u.onUndef(options.durable, false),
    priority: u.onUndef(options.priority, 4),
    ttl: options.ttl,
    firstAcquirer: u.onUndef(options.firstAcquirer, false),
    deliveryCount: u.onUndef(options.deliveryCount, 0)
  });
}

util.inherits(Header, DescribedType);

Header.prototype.Descriptor = { code: 0x70, name: 'amqp:header:list' };
Header.prototype.EncodeOrdering = [
  'durable', 'priority', 'ttl', 'firstAcquirer', 'deliveryCount'
];

Header.fromDescribedType = function(describedType) {
  var options = {};
  u.assignFromDescribedType(Header, describedType, options);

  return new Header(options);
};

Header.prototype.getValue = function() {
  var self = this;
  return {
    durable: self.durable,
    priority: new ForcedType('ubyte', self.priority),
    ttl: new ForcedType('uint', self.ttl || null),
    firstAcquirer: self.firstAcquirer,
    deliveryCount: new ForcedType('uint', self.deliveryCount),
    encodeOrdering: Header.prototype.EncodeOrdering
  };
};

module.exports.Header = Header;



/**
 *
 * @param annotations
 * @constructor
 */
function DeliveryAnnotations(annotations) {
  DeliveryAnnotations.super_.call(this, DeliveryAnnotations, annotations);
}

util.inherits(DeliveryAnnotations, DescribedType);

DeliveryAnnotations.prototype.Descriptor = { code: 0x71, name: 'amqp:delivery-annotations:map' };
DeliveryAnnotations.fromDescribedType = function(describedType) {
  return new DeliveryAnnotations(describedType.value);
};

DeliveryAnnotations.prototype.getValue = function() {
  return this.value instanceof AMQPFields ? this.value : new AMQPFields(this.value);
};

module.exports.DeliveryAnnotations = DeliveryAnnotations;



/**
 *
 * @param annotations
 * @constructor
 */
function Annotations(annotations) {
  Annotations.super_.call(this, Annotations, annotations);
}

util.inherits(Annotations, DescribedType);

Annotations.prototype.Descriptor = { code: 0x72, name: 'amqp:message-annotations:map' };
Annotations.fromDescribedType = function(describedType) {
  return new Annotations(describedType.value);
};

Annotations.prototype.getValue = function() {
  return this.value instanceof AMQPFields ? this.value : new AMQPFields(this.value);
};

module.exports.Annotations = Annotations;



/**
 *
 * @param options
 * @constructor
 */
function Properties(options) {
  Properties.super_.call(this, Properties);

  u.assignDefined(this, options, {
    messageId: options.messageId,
    userId: u.coerce(options.userId, Buffer),
    to: options.to,
    subject: options.subject,
    replyTo: options.replyTo,
    correlationId: options.correlationId,
    contentType: options.contentType,
    contentEncoding: options.contentEncoding,
    absoluteExpiryTime: options.absoluteExpiryTime,
    creationTime: options.creationTime,
    groupId: options.groupId,
    groupSequence: options.groupSequence,
    replyToGroupId: options.replyToGroupId
  });
}

util.inherits(Properties, DescribedType);

Properties.prototype.Descriptor = { code: 0x73, name: 'amqp:properties:list' };
Properties.prototype.EncodeOrdering = [
  'messageId', 'userId', 'to', 'subject', 'replyTo', 'correlationId',
  'contentType', 'contentEncoding', 'absoluteExpiryTime', 'creationTime',
  'groupId', 'groupSequence', 'replyToGroupId'
];

Properties.fromDescribedType = function(describedType) {
  var options = {};
  u.assignFromDescribedType(Properties, describedType, options);
  return new Properties(options);
};

Properties.prototype.getValue = function() {
  var self = this;
  return {
    messageId: u.orNull(self.messageId),
    userId: u.orNull(self.userId),
    to: u.orNull(self.to),
    subject: u.orNull(self.subject),
    replyTo: u.orNull(self.replyTo),
    correlationId: u.orNull(self.correlationId),
    contentType: (self.contentType === undefined) ? null : self.contentType,
    contentEncoding: (self.contentEncoding === undefined) ? null : self.contentEncoding,
    absoluteExpiryTime: (self.absoluteExpiryTime === undefined) ? null : new ForcedType('timestamp', self.absoluteExpiryTime),
    creationTime: (self.creationTime === undefined) ? null : new ForcedType('timestamp', self.creationTime),
    groupId: u.orNull(self.groupId),
    groupSequence: (self.groupSequence === undefined) ? null : new ForcedType('uint', self.groupSequence),
    replyToGroupId: u.orNull(self.replyToGroupId),
    encodeOrdering: Properties.prototype.EncodeOrdering
  };
};

module.exports.Properties = Properties;



/**
 *
 * @param properties
 * @constructor
 */
function ApplicationProperties(properties) {
  ApplicationProperties.super_.call(this, ApplicationProperties, properties);

  if (!(properties instanceof Object))
    throw errors.MalformedPayloadError('invalid application properties: ', properties);

  var _keys = Object.keys(properties), _len = _keys.length;
  for (var i = 0; i < _len; ++i) this[_keys[i]] = properties[_keys[i]];
}

util.inherits(ApplicationProperties, DescribedType);

ApplicationProperties.prototype.Descriptor = { code: 0x74, name: 'amqp:application-properties:map' };
ApplicationProperties.fromDescribedType = function(describedType) {
  return new ApplicationProperties(describedType.value);
};

module.exports.ApplicationProperties = ApplicationProperties;



/**
 *
 * @param map
 * @constructor
 */
function Footer(map) {
  Footer.super_.call(this, Footer, map);
}

util.inherits(Footer, DescribedType);

Footer.prototype.Descriptor = { code: 0x78, name: 'amqp:footer:map' };
Footer.fromDescribedType = function(describedType) {
  return new Footer(describedType.value);
};

module.exports.Footer = Footer;



/**
 *
 * @param data
 * @constructor
 */
function Data(data) {
  Data.super_.call(this, Data, data);
}

util.inherits(Data, DescribedType);

Data.prototype.Descriptor = { code: 0x75, name: 'amqp:data:binary' };
Data.fromDescribedType = function(describedType) {
  return new Data(describedType.value);
};

module.exports.Data = Data;



/**
 *
 * @param values
 * @constructor
 */
function AMQPSequence(values) {
  AMQPSequence.super_.call(this, AMQPSequence, values);
}

util.inherits(AMQPSequence, DescribedType);

AMQPSequence.prototype.Descriptor = { code: 0x76, name: 'amqp:amqp-sequence:list' };
AMQPSequence.fromDescribedType = function(describedType) {
  return new AMQPSequence(describedType.value);
};

module.exports.AMQPSequence = AMQPSequence;



/**
 *
 * @param value
 * @constructor
 */
function AMQPValue(value) {
  AMQPValue.super_.call(this, AMQPValue, value);
}

util.inherits(AMQPValue, DescribedType);

AMQPValue.prototype.Descriptor = { code: 0x77, name: 'amqp:amqp-value:*' };
AMQPValue.fromDescribedType = function(describedType) {
  return new AMQPValue(describedType.value);
};

module.exports.AMQPValue = AMQPValue;



/**
 * Actual AMQP Message, which as defined by the spec looks like:
 <pre>
                                                      Bare Message
                                                            |
                                      .---------------------+--------------------.
                                      |                                          |
 +--------+-------------+-------------+------------+--------------+--------------+--------+
 | header | delivery-   | message-    | properties | application- | application- | footer |
 |        | annotations | annotations |            | properties   | data         |        |
 +--------+-------------+-------------+------------+--------------+--------------+--------+
 |                                                                                        |
 '-------------------------------------------+--------------------------------------------'
                                             |
                                      Annotated Message
 </pre>
 *
 * The message _may_ contain the sections above, and application data _may_ be repeated, as follows:
 *
 * * Zero or one {@link Header} sections.
 * * Zero or one {@link DeliveryAnnotations} sections.
 * * Zero or one {@link Annotations} sections.
 * * Zero or one {@link Properties} sections.
 * * Zero or one {@link ApplicationProperties} sections.
 * * The body consists of either: one or more {@link Data} sections, one or more {@link AMQPSequence} sections,
 *      or a single {@link AMQPValue} section.
 * * Zero or one {@link Footer} sections.
 *
 * @param contents
 * @param body
 * @constructor
 */
function Message(contents, body) {
  contents = contents || {};
  u.assignDefined(this, contents, {
    header: u.coerce(contents.header, Header),
    deliveryAnnotations: u.coerce(contents.deliveryAnnotations, DeliveryAnnotations),
    annotations: u.coerce(contents.annotations, Annotations),
    properties: u.coerce(contents.properties, Properties),
    applicationProperties: u.coerce(contents.applicationProperties, ApplicationProperties),
    footer: u.coerce(contents.footer, Footer)
  });

  this.body = contents.body || body;
}

Message.prototype.encode = function(codec, buf) {
  if (this.header) codec.encode(this.header, buf);
  if (this.deliveryAnnotations) codec.encode(this.deliveryAnnotations, buf);
  if (this.annotations) codec.encode(this.annotations, buf);
  if (this.properties) codec.encode(this.properties, buf);
  if (this.applicationProperties) codec.encode(this.applicationProperties, buf);
  if (this.body instanceof Buffer) {
    codec.encode(new Data(this.body), buf);
  } else if (Array.isArray(this.body)) {
    codec.encode(new AMQPSequence(this.body), buf);
  } else {
    codec.encode(new AMQPValue(this.body), buf);
  }

  if (this.footer) codec.encode(this.footer, buf);
};

module.exports.Message = Message;
