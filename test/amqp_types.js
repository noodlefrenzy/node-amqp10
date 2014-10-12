var bitsyntax   = require('bitsyntax'),
    Int64       = require('node-int64'),
    should      = require('should'),
    constants   = require('../lib/constants');

/**
 * Simple test playground for verifying assumptions about bitsyntax and the JS type system.
 */
describe('TypeTest', function() {
    it('bitsyntax parser', function() {
        var expected = new Buffer([0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80]);
        var buffer = new Buffer([0x80, 0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80]);
        var parser = bitsyntax.parse('128:8, value:8/binary, rest/binary');
        var matcher = bitsyntax.match(parser, buffer);
        matcher.should.be.ok;
        matcher.value.should.eql(expected);
    });
    it('bitsyntax parser 2', function() {
        var buffer = new Buffer([0xA1, 0x3, 0x46, 0x4F, 0x4F]);
        var parser = bitsyntax.parse('161:8, len:8, value:len/binary, rest/binary');
        var matcher = bitsyntax.match(parser, buffer);
        matcher.should.be.ok;
        matcher.value.should.eql(new Buffer([0x46, 0x4F, 0x4F]));
    });
    it('should spit right version', function() {
        var expected = new Buffer([0,0,0,0,0,1,0,0]);
        expected.write('AMQP', 0);
        expected.toString('hex').should.eql(constants.amqp_version.toString('hex'));
    });
    it('should print types', function() {
        console.log('true = ' + (typeof true));
        console.log('123 = ' + (typeof 123));
        console.log('123.45 = ' + (typeof 123.45));
        console.log('"foo" = ' + (typeof "foo"));
        console.log('{ foo: "bar" } = ' + (typeof { foo: "bar" }));
        console.log('[1, 2, 3] = ' + (typeof [1, 2, 3]));
        console.log('Int64(123) = ' + (typeof (new Int64(123))));
    });
});
