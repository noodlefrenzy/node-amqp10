'use strict';
var util = require('util'),
    DescribedType = require('./described_type'),
    ForcedType = require('./forced_type');

var knownTypes = {};
function convertKnownType(described) {
  if (described === undefined || described === null ||
      (!(described instanceof DescribedType))) {
    return described;
  }

  if (knownTypes.hasOwnProperty(described.descriptor))
    return new knownTypes[described.descriptor](described);
  return undefined;
}

function wrapField(field, value) {
  if (value instanceof ForcedType) return value;
  if (value === undefined || value === null) {
    if (field.mandatory) throw new Error('missing mandatory field: ' + field.name);
    if (field.hasOwnProperty('default')) return wrapField(field, field.default);
    return null;
  }

  // e.g. Connection containerId()
  if (typeof value === 'function') value = value();

  if (field.hasOwnProperty('requires')) {
    if (value instanceof field.requires) return value;
    if (field.hasOwnProperty('type') && field.type !== '*')
      return new ForcedType(field.type, field.requires(value));
    return new field.requires(value);
  }

  if (field.type === '*') return value;

  if (Array.isArray(value)) {
    if (field.multiple === false) {
      throw Error('field ' + field.name + ' does not support multiple values, got ' + JSON.stringify(value));
    }

    if (value.length === 0) return new ForcedType(field.type, null);
    else if (value.length === 1) return new ForcedType(field.type, value[0]);
    else {
      var values = [], _len = value.length;
      for (var i = 0; i < _len; ++i) values.push(wrapField(field, value[i]));
      return new ForcedType('list', values);
    }
  }

  // @todo: this is a cheesy way to determine if its a composite type already
  if (value.toDescribedType && typeof value.toDescribedType === 'function') return value;

  return new ForcedType(field.type, value);
}

function compositeAccessors(index, field) {
  return {
    enumerable: true, configurable: false,
    get: function() {
      var value = (this.value[index] instanceof ForcedType) ? this.value[index].value : this.value[index];
      if (value === undefined && field.hasOwnProperty('default')) return field.default;
      return value;
    },
    set: function(value) { this.value[index] = wrapField(field, value); }
  };
}

function defineComposite(Base, definition) {
  if (definition === undefined) {
    definition = Base;
    Base = Object;
  }

  var Composite = function(fields) {
    fields = fields || {};
    Composite.super_.call(this, fields.channel);	 // @todo: this is AMQPFrame specific, get it out of here

    this.value = [];
    var _len = Composite.fields.length, i, field;
    if (fields instanceof DescribedType) {
      var values = fields.value ? fields.value.map(convertKnownType) : [];
      for (i = 0; i < _len; ++i) {
        field = Composite.fields[i];
        this[field.name] = values[i];
      }
    } else {
      for (i = 0; i < _len; ++i) {
        field = Composite.fields[i];
        if (fields && fields.hasOwnProperty(field.name)) {
          this[field.name] = fields[field.name];
        } else if (field.hasOwnProperty('default')) {
          this[field.name] = wrapField(field, field.default);
        } else {
          this[field.name] = null;
        }
      }
    }
  };

  Composite.fields = definition.fields;
  Composite.descriptor = {
    code: definition.code,
    name: 'amqp:' + definition.name + ':list'
  };

  var properties = {};
  for (var i = 0; i < definition.fields.length; i++) {
    var field = definition.fields[i];
    properties[field.name] = compositeAccessors(i, field);
  }

  Composite.super_ = Base;
  Composite.prototype = Object.create(Base.prototype, properties);
  Composite.prototype.toDescribedType = function() {
    return new DescribedType(Composite.descriptor.code, new ForcedType('list', this.value));
  };

  Composite.prototype.inspect = function(depth) {
    var result = '@' + definition.name + '(' + definition.code + ')';
    var _len = definition.fields.length, values = [];
    for (var i = 0; i < _len; ++i) {
      var field = definition.fields[i];
      values.push(field.name + '=' + util.inspect(this[field.name]));
    }

    result += ' [' + values.join(' ') + ']';
    return result;
  };

  knownTypes[Composite.descriptor.name] = Composite;
  knownTypes[Composite.descriptor.code] = Composite;
  return Composite;
}

module.exports = {
  defineComposite: defineComposite,
  wrapField: wrapField
};
