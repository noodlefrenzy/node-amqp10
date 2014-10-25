var should      = require('should'),
    debug       = require('debug')('amqp10-test-types'),
    builder     = require('buffer-builder'),
    Int64       = require('node-int64'),
    xml2js      = require('xml2js'),
    fs          = require('fs'),

    types       = require('../lib/types'),
    codec       = require('../lib/codec');

/*
 var buffer = builder([
 ['byte', [0x00, 0xA3, 0x11]],
 ['string', ['example:book:list']],
 ['byte', [0xC0, 0x40, 0x03, 0xA1, 0x15]],
 ['string', ['AMQP for & by Dummies']],
 ['byte', [0xE0, 0x25, 0x02, 0xA1, 0x0E]],
 ['string', ['Rob J. Godfrey']],
 ['byte', [0x13]],
 ['string', ['Rafael H. Schloming']],
 ['byte', [0x40]]
 ]);
 */

function buf(contents) {
    var bufb = new builder();
    for (var idx = 0; idx < contents.length; idx++) {
        var cur = contents[idx];
        if (typeof cur === 'function') {
            cur.call(bufb, contents[++idx]);
        } else {
            bufb.appendUInt8(cur);
        }
    }
    return bufb.get();
}

function assertEncoders(tests, maxSize) {
    for (var idx in tests) {
        var curTest = tests[idx];
        var enc = types.encoders[curTest[0]];
        var actual = new Buffer(maxSize || 100);
        actual = actual.slice(0, enc(curTest[1], actual, 0, codec));
        debug('Encoded "'+curTest[0]+'" => 0x'+actual.toString('hex'));
        actual.toString('hex').should.eql(curTest[2].toString('hex'), idx + ': ' + curTest[0] + ' encoding failed');
    }
}

function assertDecoders(tests) {
    for (var idx in tests) {
        var curTest = tests[idx];
        var dec = types.decoders[curTest[0]];
        var actual = dec(curTest[1], codec);
        debug('Decoded 0x'+curTest[1].toString('hex')+' => '+JSON.stringify(actual));
        if (curTest[3]) {
            curTest[3](actual, curTest[2]).should.be.true;
        } else {
            actual.should.eql(curTest[2], idx + ': decoding failed');
        }
    }
}

function collapseDoc(prefix, docHead) {
    var doc = prefix ? '<i>'+prefix+'</i>' : prefix;
    if (docHead) {
        for (var idx in docHead) {
            var curDoc = docHead[idx];
            if (curDoc.p) {
                for (var pidx in curDoc.p) {
                    var curP = curDoc.p[pidx];
                    if (typeof(curP) === 'string') {
                        doc += '\n' + curDoc.p[pidx];
                    } else {
                        if (curP._) {
                            doc += '\n' + curP._;
                        }
                        debugger;
                        if (curP.xref && curP.xref[0] && curP.xref[0].$ && curP.xref[0].$.name) {
                            doc += '\n' + curP.xref[0].$.name;
                        }
                    }
                }
            }
        }
    }
    return doc;
}

function buildDescriptor(descriptor) {
    var doc = '';
    if (descriptor) {
        doc += '<h3>Descriptor</h3>\n';
        doc += '<dl>\n<dt>Name</dt>\n<dd>'+descriptor[0].$.name+'</dd>\n<dt>Code</dt>\n<dd>'+descriptor[0].$.code+'</dd>\n</dl>\n';
    }
    return doc;
}

/*
 {
 "$": {
 "name": "container-id",
 "type": "string",
 "mandatory": "true",
 "label": "the id of the source container"
 }
 },

 */
function buildField(field) {
    var doc = '<tr><td>'+field.$.name+'</td><td>'+field.$.type+'</td><td>'+(field.$.mandatory?'true':'false')+'</td></tr>\n';
    var desc = collapseDoc(field.$.label, field.doc);
    if (desc) {
        doc += '<tr><td>&nbsp;</td><td colspan="2">'+desc+'</td></tr>\n';
    }
    return doc;
}

function toComment(doc) {
    return '/**\n * ' + doc.replace(/\n/g, '\n * ') + '\n *\n * @constructor\n */';
}

describe('Gen', function () {
    it('should gen performative docs', function() {
        var parser = new xml2js.Parser();
        var transportXml = fs.readFileSync('./resources/transport.xml');
        parser.parseString(transportXml, function (err, res) {
            var sections = res.amqp.section;
            for (var idx=0; idx < sections.length; ++idx) {
                if (sections[idx]['$'].name === 'performatives') {
                    var performatives = sections[idx].type;
                    fs.writeFileSync('./resources/transport.json', JSON.stringify(performatives, null, ' '));
                    for (var pidx in performatives) {
                        var performative = performatives[pidx];
                        var name = performative['$'].name;
                        var desc = collapseDoc(performative['$'].label, performative.doc);
                        var descriptor = buildDescriptor(performative.descriptor);
                        var fullDoc = '<h2>' + name + ' performative</h2>\n' + desc + '\n' + descriptor;
                        if (performative.field) {
                            var fields = '<table>\n';
                            fields += '<tr><th>Name</th><th>Type</th><th>Mandatory?</th></tr>';
                            for (var fidx in performative.field) {
                                fields += buildField(performative.field[fidx]);
                            }
                            fields += '</table>';
                            fullDoc += '\n' + fields;
                        }
                        fs.writeFileSync('./resources/'+name+'_doc.txt', toComment(fullDoc));
                    }
                }
            }
        });
    });
});

describe('Types', function() {
    describe('#encoders', function() {
        it('should encode basic primitives', function() {
            var toTest = [
                [ 'null', null, buf([0x40]) ],
                [ 'boolean', true, buf([0x41]) ],
                [ 'boolean', false, buf([0x42]) ],
                [ 'uint', 10000, buf([0x70, builder.prototype.appendUInt32BE, 10000]) ],
                [ 'uint', 100, buf([0x52, builder.prototype.appendUInt8, 100]) ],
                [ 'uint', 0, buf([0x43]) ],
                [ 'int', -10000, buf([0x71, builder.prototype.appendInt32BE, -10000]) ],
                [ 'double', 123.45, buf([0x82, builder.prototype.appendDoubleBE, 123.45]) ],
                [ 'long', new Int64(0xFFFFFFFF, 0xFFFFFFFF), buf([0x81, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]) ]
            ];

            assertEncoders(toTest);
        });

        it('should encode variable primitives', function() {
            var toTest = [
                [ 'string', 'foo', buf([0xA1, 0x03, builder.prototype.appendString, 'foo']) ]
            ];

            assertEncoders(toTest);
        });

        it('should encode lists', function() {
            var toTest = [
                [ 'list', [], buf([0x45]) ],
                [ 'list', [ 123, 456 ], buf([0xC0, 0xB, 0x2, 0x71, builder.prototype.appendInt32BE, 123, 0x71, builder.prototype.appendInt32BE, 456]) ]
            ];

            assertEncoders(toTest);
        });
    });

    describe('#decoders()', function() {
        it('should decode basic primitives', function() {
            var toTest = [
                [ 0x40, new Buffer([]), null, function(a,b) { return a === b; } ],
                [ 0x41, new Buffer([]), true ],
                [ 0x42, new Buffer([]), false ],
                [ 0x56, buf([0x01]), true ],
                [ 0x70, buf([builder.prototype.appendInt32BE, 123]), 123 ],
                [ 0x82, buf([builder.prototype.appendDoubleBE, 123.45]), 123.45 ],
                [ 0x55, buf([0x23]), 0x23 ],
                [ 0x81, buf([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]), new Int64(0xFFFFFFFF, 0xFFFFFFFF),
                    function(a,b) { return (a instanceof Int64) && a.toOctetString() == b.toOctetString(); }]
            ];

            assertDecoders(toTest);
        });

        it('should decode variable primitives', function() {
            var toTest = [
                [ 0xa1, buf([3, builder.prototype.appendString, 'foo' ]), 'foo' ],
                [ 0xb1, buf([builder.prototype.appendUInt32BE, 3, builder.prototype.appendString, 'foo' ]), 'foo' ],
                [ 0xa3, buf([3, builder.prototype.appendString, 'foo' ]), 'foo' ],
                [ 0xb3, buf([builder.prototype.appendUInt32BE, 3, builder.prototype.appendString, 'foo' ]), 'foo' ]
            ];

            assertDecoders(toTest);
        });

        it('should decode lists', function() {
            var toTest = [
                [ 0x45, new Buffer([]), [] ],
                [ 0xC0, buf([0xB, 0x2, 0x71, builder.prototype.appendInt32BE, 123, 0x71, builder.prototype.appendInt32BE, 456]), [ 123, 456 ] ]
            ];

            assertDecoders(toTest);
        });
    });
});