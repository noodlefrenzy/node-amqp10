var Int64   = require('node-int64');

var NotYetImplemented = function(name, buffer) { throw new Error(name + ' parsing is not yet implemented.'); };

var constants = {
    // TODO: bit 5 should be protocol (e.g. PLAIN/SASL).
    default_port: 5672,
    default_tls_port: 5761,
    min_max_frame_size: 512,
    amqp_version: function() { var version = new Buffer([0,0,0,0,0,1,0,0]); version.write('AMQP', 0); return version; }(),
    frame_type: {
        amqp: 0x0, sasl: 0x1
    },
    types: {
        _null: { code: 0x40, builder: function() { return null; } },
        _true: { code: 0x41, builder: function() { return true; } },
        _false: { code: 0x42, builder: function() { return false; } },
        _uint0: { code: 0x43, builder: function() { return 0; } },
        _ulong0: { code: 0x44, builder: function() { return new Int64(0); } },
        _ubyte: { code: 0x50, length: 8, type: 'integer' },
        _byte: { code: 0x51, length: 8, type: 'integer' },
        _smalluint: { code: 0x52, length: 16, type: 'integer' },
        _smallulong: { code: 0x53, length: 1, builder: function(buffer) { return new Int64(buffer); } },
        _smallint: { code: 0x54, length: 1 },
        _smalllong: { code: 0x55, length: 1 },
        _boolean: { code: 0x56, length: 1, builder: function(buffer) { return buffer[0] == 0x01; } },
        _ushort: { code: 0x60, length: 16, type: 'integer' },
        _short: { code: 0x61, length: 16, type: 'integer' },
        _uint: { code: 0x70, length: 32, type: 'integer' },
        _int: { code: 0x71, length: 32, type: 'integer' },
        _float: { code: 0x72, length: 32, type: 'float' },
        _char: { code: 0x73, length: 4, builder: NotYetImplemented.bind('char') },
        _decimal32: { code: 0x74, length: 4, builder: NotYetImplemented.bind('decimal32') },
        _ulong: { code: 0x80, length: 8, builder: function(buffer) { return new Int64(buffer); } },
        _long: { code: 0x81, length: 8, builder: function(buffer) { return new Int64(buffer); } },
        _double: { code: 0x82, length: 64, type: 'float' },
        _timestamp: { code: 0x83, length: 8, builder: function(buffer) { return new Int64(buffer); } },
        _decimal64: { code: 0x84, length: 8, builder: NotYetImplemented.bind('decimal64') },
        _decimal128: { code: 0x94, length: 16, builder: NotYetImplemented.bind('decimal128') },
        _utf8: { code: 0xA1, variable: 8, builder: function(len, buffer) { return buffer.toString('utf8', 0, len); } },
        _longutf8: { code: 0xB1, variable: 32, builder: function(len, buffer) { return buffer.toString('utf8', 0, len); } }
    },
    descriptor_code: 0x00
};

module.exports = constants;
