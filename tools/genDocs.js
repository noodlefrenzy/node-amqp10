'use strict';

var     xml2js      = require('xml2js'),
        fs          = require('fs');

function collapseDoc(prefix, docHead) {
    var doc = prefix ? '<i>'+prefix+'</i>' : prefix;
    if (docHead) {
        for (var idx in docHead) {
            var curDoc = docHead[idx];
            if (curDoc.p) {
                for (var pidx in curDoc.p) {
                    var curP = curDoc.p[pidx];
                    if (typeof(curP) === 'string') {
                        doc += '\n<p>' + curDoc.p[pidx] + '</p>';
                    } else {
                        if (curP._) {
                            doc += '\n<p>' + curP._ + '</p>';
                        }
                        if (curP.xref && curP.xref[0] && curP.xref[0].$ && curP.xref[0].$.name) {
                            doc += '\n<p>' + curP.xref[0].$.name + '</p>';
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

function buildField(field) {
    var doc = '<tr><td>'+field.$.name+'</td><td>'+field.$.type+'</td><td>'+(field.$.mandatory?'true':'false')+'</td><td>'+(field.$.multiple?'true':'false')+'</td></tr>\n';
    var desc = collapseDoc(field.$.label, field.doc);
    if (desc) {
        doc += '<tr><td>&nbsp;</td><td colspan="3">'+desc+'</td></tr>\n';
    }
    return doc;
}

function toComment(doc) {
    return '/**\n * ' + doc.replace(/\n/g, '\n * ') + '\n *\n * @constructor\n */';
}

function generatePerformatives() {
    var parser = new xml2js.Parser();
    var transportXml = fs.readFileSync('./resources/transport.xml');
    parser.parseString(transportXml, function (err, res) {
        var sections = res.amqp.section;
        for (var idx=0; idx < sections.length; ++idx) {
            if (sections[idx].$.name === 'performatives') {
                var performatives = sections[idx].type;
                fs.writeFileSync('./resources/transport.json', JSON.stringify(performatives, null, ' '));
                for (var pidx in performatives) {
                    var performative = performatives[pidx];
                    var name = performative.$.name;
                    var desc = collapseDoc(performative.$.label, performative.doc);
                    var descriptor = buildDescriptor(performative.descriptor);
                    var fullDoc = '<h2>' + name + ' performative</h2>\n' + desc + '\n' + descriptor;
                    if (performative.field) {
                        var fields = '<table border="1">\n';
                        fields += '<tr><th>Name</th><th>Type</th><th>Mandatory?</th><th>Multiple?</th></tr>';
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
}

generatePerformatives();
