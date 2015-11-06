'use strict';
var Benchmark = require('benchmark'),
    suite = new Benchmark.Suite(),
    codec = require('../../lib/codec');

suite
  .add('Codec#_readFullValue (floats)', function() {
    var data = new Buffer([0xa1, 0x03, 0x46, 0x4f, 0x4f]);
    codec._readFullValue(data, 0, false, undefined);
  })
  .add('Codec#_readFullValue (buffers)', function() {
    var data = new Buffer([ 0xA0, 0x3, 0x7b, 0x22, 0x7d ]);
    codec._readFullValue(data, 0, false, undefined);
  })
  .add('Codec#_readFullValue (OpenFrame)', function() {
    var data = new Buffer('005310d00000008a0000000aa12436323534643338332d616263612d343032342d386237322d6537656237303236653966394040607fff700001d4c040404040d10000004d00000008a30770726f64756374a108717069642d637070a30776657273696f6ea104302e3334a308706c6174666f726da1054c696e7578a304686f7374a10e73696d756c617465642d63656c6c', 'hex');
    codec._readFullValue(data, 0, false, undefined);
  })
  .add('Codec#_readFullValue (Message.Header)', function() {
    var data = new Buffer('005370c006044250044041005377a10474657374', 'hex');
    codec._readFullValue(data, 0, false, undefined);
  })
  .add('Codec#decode (Message.Header)', function() {
    var data = new Buffer('005370c006044250044041005377a10474657374', 'hex');
    codec.decode(data);
  })
  .on('cycle', function(event) { console.log(String(event.target)); })
  .on('error', function(err) { console.log(err); })
  .run({ async: true });
