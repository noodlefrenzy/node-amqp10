var Int64           = require('node-int64'),
    util            = require('util'),

    constants       = require('../constants'),
    exceptions      = require('../exceptions'),

    AMQPError       = require('./amqp_error'),
    DescribedType   = require('./described_type'),
    ForcedType      = require('./forced_type'),
    Symbol          = require('./symbol');

function Header(options) {
    Header.super_.call(this, Header.Descriptor.code);
}

util.inherits(Header, DescribedType);

Header.Descriptor = {
    name: new Symbol('amqp:header:list'),
    code: new Int64(0x0, 0x70)
};

Header.fromDescribedType = function(describedType) {
    var headerArr = describedType.value;
    var idx = 0;
    var options = {
    };
    return new Header(options);
};

Header.prototype.getValue = function() {
    var self = this;
    return {
        encodeOrdering: []
    };
};

module.exports.Header = Header;

function DeliveryAnnotations(annotations) {
    DeliveryAnnotations.super_.call(this, DeliveryAnnotations.Descriptor.code, annotations);
}

util.inherits(DeliveryAnnotations, DescribedType);

DeliveryAnnotations.Descriptor = {
    name: new Symbol('amqp:delivery-annotations:map'),
    code: new Int64(0x0, 0x71)
};

DeliveryAnnotations.fromDescribedType = function(describedType) {
    return new DeliveryAnnotations(describedType.value);
};

module.exports.DeliveryAnnotations = DeliveryAnnotations;

function Annotations(annotations) {
    Annotations.super_.call(this, Annotations.Descriptor.code, annotations);
}

util.inherits(Annotations, DescribedType);

Annotations.Descriptor = {
    name: new Symbol('amqp:message-annotations:map'),
    code: new Int64(0x0, 0x72)
};

Annotations.fromDescribedType = function(describedType) {
    return new Annotations(describedType.value);
};

module.exports.Annotations = Annotations;

function Properties(options) {
    Properties.super_.call(this, Properties.Descriptor.code);
}

util.inherits(Properties, DescribedType);

Properties.Descriptor = {
    name: new Symbol('amqp:properties:list'),
    code: new Int64(0x0, 0x73)
};

Properties.fromDescribedType = function(describedType) {
    var headerArr = describedType.value;
    var idx = 0;
    var options = {
    };
    return new Properties(options);
};

Properties.prototype.getValue = function() {
    var self = this;
    return {
        encodeOrdering: []
    };
};

module.exports.Properties = Properties;

function ApplicationProperties(properties) {
    ApplicationProperties.super_.call(this, ApplicationProperties.Descriptor.code, properties);
}

util.inherits(ApplicationProperties, DescribedType);

ApplicationProperties.Descriptor = {
    name: new Symbol('amqp:application-properties:map'),
    code: new Int64(0x0, 0x74)
};

ApplicationProperties.fromDescribedType = function(describedType) {
    return new ApplicationProperties(describedType.value);
};

module.exports.ApplicationProperties = ApplicationProperties;

function Footer(map) {
    Footer.super_.call(this, Footer.Descriptor.code, map);
}

util.inherits(Footer, DescribedType);

Footer.Descriptor = {
    name: new Symbol('amqp:footer:map'),
    code: new Int64(0x0, 0x78)
};

Footer.fromDescribedType = function(describedType) {
    return new Footer(describedType.value);
};

module.exports.Footer = Footer;

function Data(data) {
    Data.super_.call(this, Data.Descriptor.code, data);
}

util.inherits(Data, DescribedType);

Data.Descriptor = {
    name: new Symbol('amqp:data:binary'),
    code: new Int64(0x0, 0x75)
};

Data.fromDescribedType = function(describedType) {
    return new Data(describedType.value);
};

module.exports.Data = Data;

function AMQPSequence(values) {
    AMQPSequence.super_.call(this, AMQPSequence.Descriptor.code, values);
}

util.inherits(AMQPSequence, DescribedType);

AMQPSequence.Descriptor = {
    name: new Symbol('amqp:amqp-sequence:list'),
    code: new Int64(0x0, 0x76)
};

AMQPSequence.fromDescribedType = function(describedType) {
    return new AMQPSequence(describedType.value);
};

module.exports.AMQPSequence = AMQPSequence;

function AMQPValue(value) {
    AMQPValue.super_.call(this, AMQPValue.Descriptor.code, value);
}

util.inherits(AMQPValue, DescribedType);

AMQPValue.Descriptor = {
    name: new Symbol('amqp:amqp-value:*'),
    code: new Int64(0x0, 0x77)
};

AMQPValue.fromDescribedType = function(describedType) {
    return new AMQPValue(describedType.value);
};

module.exports.AMQPValue = AMQPValue;

