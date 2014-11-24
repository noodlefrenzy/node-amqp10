var debug           = require('debug')('amqp10-client'),

    Connection      = require('./lib/connection'),
    Sasl            = require('./lib/sasl');

function AMQPClient() {

}

// Constants
AMQPClient.AddressRegex = new RegExp('^(amqps?)://([^:/]+)(?::([0-9]+))?(/.*)?$');
AMQPClient.AddressWithCredentialsRegex = new RegExp('^(amqps?)://([^:]+):([^@]+)@([^:/]+)(?::([0-9]+))?(/.*)?$');

// Static Methods
AMQPClient.GetPort = function(port, protocol) {
    if (port) {
        if (!isNaN(parseFloat(port)) && isFinite(port) && (port % 1 === 0)) {
            return port;
        } else {
            throw new Error('Invalid port: '+port);
        }
    } else {
        switch (protocol) {
            case 'amqp':
                return '5672';
            case 'amqps':
                return '5671';
            default:
                throw new Error('Unknown Protocol ' + protocol);
        }
    }
};

AMQPClient.ParseAddress = function(address) {
    var results = AMQPClient.AddressWithCredentialsRegex.exec(address);
    if (results) {
        return {
            protocol: results[1],
            user: results[2],
            pass: results[3],
            host: results[4],
            port: AMQPClient.GetPort(results[5], results[1]),
            path: results[6] || '/'
        };
    } else {
        results = AMQPClient.AddressRegex.exec(address);
        if (results) {
            debugger;
            return {
                protocol: results[1],
                host: results[2],
                port: AMQPClient.GetPort(results[3], results[1]),
                path: results[4] || '/'
            };
        }
    }

    throw new Error('Failed to parse ' + address);
};

module.exports = AMQPClient;
