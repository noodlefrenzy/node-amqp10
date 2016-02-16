'use strict';

var fs = require('fs'),
    Int64 = require('node-int64'),
    constants = require('../lib/constants');

if (process.argv.length < 3) {
  console.warn('Usage: node ' + process.argv[1] + ' <debug output file>');
  process.exit(1);
}

var debugOutputFile = process.argv[2];
var tryToConvert = true;

var rxPrefix = 'amqp10:connection Rx:';
var txPrefix = 'amqp10:framing sending frame:';

function s(cnt) {
  var r = '';
  for (var idx = 0; idx < cnt; ++idx) r += ' ';
  return r;
}

function checkLength(str, l) {
  if (str.length < l) {
    console.log('String smaller than expected: ('+str.length+' < '+l+')');
    return false;
  }
  return true;
}

function x(hexstr, consumed, result, indent) {
  if (hexstr.length === 0) return { consumed: consumed, result: result };

  var prefix = hexstr.substr(0, 2);
  hexstr = hexstr.substr(2);
  consumed += 2;
  if (prefix === '00') {
    result += s(indent) + prefix + '\n';
    var label = x(hexstr, consumed, result, indent + 2);
    hexstr = hexstr.substr(label.consumed - consumed);
    result = label.result;
    consumed = label.consumed;
    var body = x(hexstr, consumed, result, indent + 2);
    hexstr = hexstr.substr(body.consumed - consumed);
    result = body.result;
    consumed = body.consumed;
  } else {
    var len, nent, val, parsedColl;
    switch (prefix[0]) {
      case '4':
        result += s(indent) + prefix + '\n';
        break;
      case '5':
        val = hexstr.substr(0, 2);
        consumed += 2;
        hexstr = hexstr.substr(2);
        result += s(indent) + prefix + ' ' + val + '\n';
        break;
      case '6':
        val = hexstr.substr(0, 4);
        consumed += 4;
        hexstr = hexstr.substr(4);
        result += s(indent) + prefix + ' ' + val + '\n';
        break;
      case '7':
        val = hexstr.substr(0, 8);
        consumed += 8;
        hexstr = hexstr.substr(8);
        result += s(indent) + prefix + ' ' + val + '\n';
        break;
      case '8':
        val = hexstr.substr(0, 16);
        consumed += 16;
        hexstr = hexstr.substr(16);
        result += s(indent) + prefix + ' ' + val + '\n';
        break;
      case 'a':
        len = new Buffer(hexstr.substr(0, 2), 'hex').readUInt8(0);
        consumed += 2;
        hexstr = hexstr.substr(2);
        val = hexstr.substr(0, len * 2);
        consumed += len * 2;
        hexstr = hexstr.substr(len * 2);
        if (tryToConvert || prefix[1] === '1' || prefix[1] === '3') val = new Buffer(val, 'hex').toString('utf8');
        result += s(indent) + prefix + ' ' + len + '\n' + s(indent + 2) + val + '\n';
        break;
      case 'b':
        len = new Buffer(hexstr.substr(0, 8), 'hex').readUInt32BE(0);
        consumed += 8;
        hexstr = hexstr.substr(8);
        val = hexstr.substr(0, len * 2);
        consumed += len * 2;
        hexstr = hexstr.substr(len * 2);
        if (tryToConvert || prefix[1] === '1' || prefix[1] === '3') val = new Buffer(val, 'hex').toString('utf8');
        result += s(indent) + prefix + ' ' + len + '\n' + s(indent + 2) + val + '\n';
        break;
      case 'c':
        len = new Buffer(hexstr.substr(0, 2), 'hex').readUInt8(0);
        consumed += 2;
        hexstr = hexstr.substr(2);
        nent = new Buffer(hexstr.substr(0, 2), 'hex').readUInt8(0);
        consumed += 2;
        hexstr = hexstr.substr(2);
        val = hexstr.substr(0, (len - 1) * 2);
        consumed += (len - 1) * 2;
        hexstr = hexstr.substr((len - 1) * 2);
        parsedColl = x(val, 0, '', indent + 2);
        result += s(indent) + prefix + ' ' + len + ' ' + nent + '\n' + parsedColl.result;
        break;
      case 'd':
        len = new Buffer(hexstr.substr(0, 8), 'hex').readUInt32BE(0);
        consumed += 8;
        hexstr = hexstr.substr(8);
        nent = new Buffer(hexstr.substr(0, 8), 'hex').readUInt32BE(0);
        consumed += 8;
        hexstr = hexstr.substr(8);
        val = hexstr.substr(0, (len - 1) * 2);
        consumed += (len - 1) * 2;
        hexstr = hexstr.substr((len - 1) * 2);
        parsedColl = x(val, 0, '', indent + 2);
        result += s(indent) + prefix + ' ' + len + ' ' + nent + '\n' + parsedColl.result;
        break;
      default:
        console.log('Error: Unexpected prefix ' + prefix);
        result += s(indent) + prefix + ' unexpected\n';
        break;
    }
  }
  return x(hexstr, consumed, result, indent);
}

function parseHex(hexstr) {
  var amqpstr = constants.amqpVersion.toString('hex');
  var headerIdx = hexstr.indexOf(amqpstr);
  var body = hexstr;
  if (headerIdx === -1) {
    console.log('Header "' + amqpstr + '" not found, assuming partial trace.  If trace is not frame-aligned, results will be incorrect.');
  } else {
    body = hexstr.substr(headerIdx + amqpstr.length);
  }

  // Assume everything from here on out is frames
  var parsed = '';
  var error = false;
  while (!error && body.length > 0) {
    var lengthstr = body.substr(0, 8);
    if (checkLength(body, 16)) {
      body = body.substr(16);
      var frameLength64 = new Int64(new Buffer('00000000' + lengthstr, 'hex'));
      var frameLength = frameLength64.valueOf() * 2 - (8*2);
      if (checkLength(body, frameLength)) {
        var frame = body.substr(0, frameLength);
        var parsedFrame = x(frame, 0, '', 2).result;
        parsed += 'Frame of length ' + frameLength + ':\n';
        parsed += parsedFrame;
        body = body.substr(frameLength);
      } else error = true;
    } else error = true;
  }
  return parsed;
}

fs.readFile(debugOutputFile, function (err, data) {
  var lines = data.toString().split('\n');
  var rxHex = '';
  var txHex = '';
  for (var idx in lines) {
    var line = lines[idx].trim();
    var idxOfPrefix = line.indexOf(rxPrefix);
    if (idxOfPrefix >= 0) {
      var curRxHex = line.substr(idxOfPrefix + rxPrefix.length + 1).trim();
      if (curRxHex.indexOf(' +') !== -1) {
        curRxHex = curRxHex.substr(0, curRxHex.indexOf(' +'));
      }
      rxHex += curRxHex;
    }
    idxOfPrefix = line.indexOf(txPrefix);
    if (idxOfPrefix >= 0) {
      var rest = line.substr(idxOfPrefix + txPrefix.length + 1).trim();
      var idxOfHexStart = rest.indexOf('] : ');
      if (idxOfHexStart >= 0) {
        var curTxHex = rest.substr(idxOfHexStart + '] : '.length);
        if (curTxHex.indexOf(' +') !== -1) {
          curTxHex = curTxHex.substr(0, curTxHex.indexOf(' +'));
        }
        txHex += curTxHex;
      }
    }
  }
  var parsedRxHex = parseHex(rxHex);
  var parsedTxHex = parseHex(txHex);
  console.log('============================================');
  console.log('=============== Received ===================');
  console.log('============================================\n');
  console.log('Hex:');
  console.log(rxHex);
  console.log('\nParsed:');
  console.log(parsedRxHex);
  console.log('\n============================================');
  console.log('================= Sent =====================');
  console.log('============================================\n');
  console.log('Hex:');
  console.log(txHex);
  console.log('\nParsed:');
  console.log(parsedTxHex);
});
