'use strict';
var DescribedType = require('../types/described_type'),
    ForcedType = require('../types/forced_type');

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
    return null;
  }

  if (field.type === '*') {
    if (field.hasOwnProperty('requires'))
       return (value instanceof field.requires) ? value : new field.requires(value);
    return value;
  }

  if (Array.isArray(value)) {
    if (field.multiple === false) {
      throw Error('field ' + field.name + ' does not support multiple values, got ' + JSON.stringify(value));
    }

    if (value.length === 0) return new ForcedType(field.type, null);
    else if (value.length === 1) return new ForcedType(field.type, value[0]);
    else {
      var values = [], _len = value.length;
      for (var i = 0; i < _len; ++i) {
        values.push(new ForcedType(field.type, value[i]));
      }

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
      return (this.value[index] instanceof ForcedType) ? this.value[index].value : this.value[index];
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
    Composite.super_.call(this, fields.channel);	 // @todo this is AMQPFrame specific, get it out of here
    if (fields instanceof DescribedType) {
      this.value = fields.value ? fields.value.map(convertKnownType) : [];
      return;
    }

    this.value = [];
    var _len = Composite.fields.length;
    for (var i = 0; i < _len; ++i) {
      var field = Composite.fields[i];
      if (fields && fields.hasOwnProperty(field.name)) {
        this[field.name] = fields[field.name];
      } else if (field.hasOwnProperty('default')) {
        this[field.name] = new ForcedType(field.type, field.default);
      } else {
        this[field.name] = null;
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

  knownTypes[Composite.descriptor.name] = Composite;
  knownTypes[Composite.descriptor.code] = Composite;
  return Composite;
}

module.exports = defineComposite;
