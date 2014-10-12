var debug       = require('debug')('amqp10-types'),
    fs          = require('fs'),
    xml2js      = require('xml2js');

/**
 * Start of a class for converting the XML type definitions into executable codec code.
 * 
 * @constructor
 */
var Types = function() {
    this.byName = {};
    this.byCode = {};
};

Types.prototype.parse = function(typesFile, cb) {
    var self = this;
    fs.readFile(typesFile, function (err, data) {
        if (err) {
            console.warn('Failed to read Types file '+typesFile+': '+err);
            cb(err);
        } else {
            var parser = xml2js.Parser();
            parser.parseString(data, function (err2, result) {
                if (err2) {
                    console.warn('Failed to parse XML from Types file '+typesFile+': '+err2);
                    cb(err2);
                } else {
                    self._processTypes(result);
                    cb();
                }
            });
        }
    });
};

Types.prototype._processTypes = function(parsedXml) {
    var types = parsedXml.amqp.section.map(function (section) {
        return section.type || [];
    });
    //fs.writeFileSync('c:/dev/types.json', JSON.stringify(types));
};

Types.prototype.fromName = function(name) {
    return this.byName[name];
};

Types.prototype.fromCode = function(code) {
    return this.byCode[code];
};

module.exports = Types;
