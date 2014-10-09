var net         = require('net'),
    debug       = require('debug')('Connection'),

    constants   = require('./constants');

var Connection = function () {
    this.addressRegex = new RegExp('(amqps?)://([^:/]+)(?::([0-9]+))?(/.*)?');
    this.client = null;
    this.connectedTo = null;
};
Connection.prototype._defaultPort = function(protocol) {
    switch (protocol) {
        case 'amqp': return '5672';
        case 'amqps': return '5671';
        default: throw new Error('Unknown Protocol '+protocol);
    }
};

Connection.prototype._parseAddress = function(address) {
    var results = this.addressRegex.exec(address);
    if (!results) throw new Error('Failed to parse ' + address);
    return {
        protocol: results[1],
        host: results[2],
        port: results[3] || this._defaultPort(results[1]),
        path: results[4] || '/'
    };
};

Connection.prototype.open = function(address) {
    // Open address via TCP
    // TLS negotiation?
    // Send version protocol header
    // Read server's protocol header
    // If there's a mismatch, close socket and throw error
    // Else...
    if (this.client) throw new Error('Already connected to ' + this.connectedTo);

    var parsedAddress = this._parseAddress(address);
    var self = this;
    self.connectedTo = address;
    self.client = net.connect({ port: parsedAddress.port, host: parsedAddress.host });
    self.client.on('connect', function() {
        debug('Connected');
        self.client.write(constants.amqp_version);
    }).on('data', function(buf) {
        debug('Rx: ' + buf.toString('hex'));
    }).on('error', function(err) {
        console.warn('Error from socket: ' + err);
    }).on('end', function() {
        debug('Connection terminated');
    });
};

Connection.prototype.close = function() {
    if (this.client) {
        this.connectedTo = null;
        this.client.end();
        this.client = null;
    }
};

module.exports = Connection;