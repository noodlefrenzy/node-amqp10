'use strict';

var _ = require('lodash'),
    Int64 = require('node-int64'),
    util = require('util'),

    constants = require('../constants'),

    AMQPFields = require('./amqp_composites').Fields,
    AMQPError = require('./amqp_error'),
    DescribedType = require('./described_type'),
    ForcedType = require('./forced_type'),
    AMQPSymbol = require('./amqp_symbol'),

    u = require('../utilities');



/**
 *
 * @param options
 * @constructor
 */
function Header(options) {
  Header.super_.call(this, Header);
  this.durable = u.onUndef(options.durable, false);
  this.priority = u.onUndef(options.priority, 4);
  this.ttl = options.ttl;
  this.firstAcquirer = u.onUndef(options.firstAcquirer, false);
  this.deliveryCount = u.onUndef(options.deliveryCount, 0);
}

util.inherits(Header, DescribedType);

Header.prototype.Descriptor = {
  name: new AMQPSymbol('amqp:header:list'),
  code: new Int64(0x0, 0x70)
};

Header.fromDescribedType = function(describedType) {
  var headerArr = describedType.value;
  var idx = 0;
  var options = {
    durable: u.onUndef(headerArr[idx++], false),
    priority: u.onUndef(headerArr[idx++], 4),
    ttl: headerArr[idx++],
    firstAcquirer: u.onUndef(headerArr[idx++], false),
    deliveryCount: u.onUndef(headerArr[idx++], 0)
  };
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
    encodeOrdering: ['durable', 'priority', 'ttl', 'firstAcquirer', 'deliveryCount']
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

DeliveryAnnotations.prototype.Descriptor = {
  name: new AMQPSymbol('amqp:delivery-annotations:map'),
  code: new Int64(0x0, 0x71)
};

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

Annotations.prototype.Descriptor = {
  name: new AMQPSymbol('amqp:message-annotations:map'),
  code: new Int64(0x0, 0x72)
};

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
  this.messageId = options.messageId;
  this.userId = u.coerce(options.userId, Buffer);
  this.to = options.to;
  this.subject = options.subject;
  this.replyTo = options.replyTo;
  this.correlationId = options.correlationId;
  this.contentType = options.contentType;
  this.contentEncoding = options.contentEncoding;
  this.absoluteExpiryTime = options.absoluteExpiryTime;
  this.creationTime = options.creationTime;
  this.groupId = options.groupId;
  this.groupSequence = options.groupSequence;
  this.replyToGroupId = options.replyToGroupId;
}

util.inherits(Properties, DescribedType);

Properties.prototype.Descriptor = {
  name: new AMQPSymbol('amqp:properties:list'),
  code: new Int64(0x0, 0x73)
};

Properties.fromDescribedType = function(describedType) {
  var propertiesArr = describedType.value;
  var idx = 0;
  var options = {
    messageId: propertiesArr[idx++],
    userId: propertiesArr[idx++],
    to: propertiesArr[idx++],
    subject: propertiesArr[idx++],
    replyTo: propertiesArr[idx++],
    correlationId: propertiesArr[idx++],
    contentType: propertiesArr[idx++],
    contentEncoding: propertiesArr[idx++],
    absoluteExpiryTime: propertiesArr[idx++],
    creationTime: propertiesArr[idx++],
    groupId: propertiesArr[idx++],
    groupSequence: propertiesArr[idx++],
    replyToGroupId: propertiesArr[idx++]
  };

  ['contentType', 'contentEncoding'].forEach(function(option) {
    if (options[option] instanceof AMQPSymbol)
      options[option] = options[option].contents;
  });

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
    contentType: (self.contentType === undefined) ? null : new AMQPSymbol(self.contentType),
    contentEncoding: (self.contentEncoding === undefined) ? null : new AMQPSymbol(self.contentEncoding),
    absoluteExpiryTime: (self.absoluteExpiryTime === undefined) ? null : new ForcedType('timestamp', self.absoluteExpiryTime),
    creationTime: (self.creationTime === undefined) ? null : new ForcedType('timestamp', self.creationTime),
    groupId: u.orNull(self.groupId),
    groupSequence: (self.groupSequence === undefined) ? null : new ForcedType('uint', self.groupSequence),
    replyToGroupId: u.orNull(self.replyToGroupId),
    encodeOrdering: [
      'messageId', 'userId', 'to', 'subject', 'replyTo', 'correlationId',
      'contentType', 'contentEncoding', 'absoluteExpiryTime', 'creationTime',
      'groupId', 'groupSequence', 'replyToGroupId'
    ]
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
}

util.inherits(ApplicationProperties, DescribedType);

ApplicationProperties.prototype.Descriptor = {
  name: new AMQPSymbol('amqp:application-properties:map'),
  code: new Int64(0x0, 0x74)
};

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

Footer.prototype.Descriptor = {
  name: new AMQPSymbol('amqp:footer:map'),
  code: new Int64(0x0, 0x78)
};

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

Data.prototype.Descriptor = {
  name: new AMQPSymbol('amqp:data:binary'),
  code: new Int64(0x0, 0x75)
};

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

AMQPSequence.prototype.Descriptor = {
  name: new AMQPSymbol('amqp:amqp-sequence:list'),
  code: new Int64(0x0, 0x76)
};

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

AMQPValue.prototype.Descriptor = {
  name: new AMQPSymbol('amqp:amqp-value:*'),
  code: new Int64(0x0, 0x77)
};

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
  this.header = u.coerce(contents.header, Header);
  this.deliveryAnnotations =
    u.coerce(contents.deliveryAnnotations, DeliveryAnnotations);
  this.annotations = u.coerce(contents.annotations, Annotations);
  this.properties = u.coerce(contents.properties, Properties);
  this.applicationProperties =
    u.coerce(contents.applicationProperties, ApplicationProperties);
  this.footer = u.coerce(contents.footer, Footer);

  this.body = contents.body || body || [];
}

Message.prototype.encode = function(codec, buf) {
  if (this.header) codec.encode(this.header, buf);
  if (this.deliveryAnnotations) codec.encode(this.deliveryAnnotations, buf);
  if (this.annotations) codec.encode(this.annotations, buf);
  if (this.properties) codec.encode(this.properties, buf);
  if (this.applicationProperties) codec.encode(this.applicationProperties, buf);
  if (this.body.length > 1) {
    if (this.body instanceof Buffer) {
      codec.encode(new Data(this.body), buf);
    } else if (typeof this.body === 'string') {
      codec.encode(new AMQPValue(this.body), buf);
    } else {
      codec.encode(new AMQPSequence(this.body), buf);
    }
  } else {
    if (this.body[0] instanceof Buffer) {
      codec.encode(new Data(this.body[0]), buf);
    } else if (_.isPlainObject(this.body)) {
      codec.encode(new AMQPValue(this.body), buf);
    } else {
      codec.encode(new AMQPValue(this.body[0]), buf);
    }
  }
  if (this.footer) codec.encode(this.footer, buf);
};

module.exports.Message = Message;
