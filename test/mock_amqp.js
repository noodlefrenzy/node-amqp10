var btools      = require('buffertools'),
    cbuf        = require('cbarrick-circular-buffer'),
    debug       = require('debug')('amqp10-MockServer'),
    net         = require('net'),
    StateMachine= require('stately.js'),
    should      = require('should'),

    constants   = require('../lib/constants');

var MockServer = function(port) {
    this.server = null;
    this.conn = null;
    this.port = port || 4321;
    this.data = new cbuf({ size: 1024, encoding: 'buffer' });
    this.requestsExpected = [];
    this.responsesToSend = [];
};

MockServer.prototype.setup = function() {
    if (this.server) {
        this.teardown();
    }

    var self = this;
    this.server = net.createServer(function (c) {
        debug('Connection established');
        c.on('end', function() { debug('Connection terminated'); });
        c.on('data', function(d) { self.data.write(d); self._testData(); });
        self.conn = c;
    });
    this.server.on('error', function(err) {
        should.fail('Error starting mock server: '+err);
    });
    this.server.listen(this.port, function() {
        debug('Server listening on '+self.port);
    });
};

MockServer.prototype.teardown = function() {
    if (this.server) {
        this.server.close(function() { debug('Server shutting down'); });
        this.server = null;
    }
};

MockServer.prototype.setSequence = function(reqs, resps) {
    this.requestsExpected = reqs;
    this.responsesToSend = resps;
};

MockServer.prototype._testData = function() {
    var expected = this.requestsExpected[0];
    if (this.data.length >= expected.length) {
        expected = this.requestsExpected.shift();
        var actual = this.data.read(expected.length);
        actual.toString('hex').should.eql(expected.toString('hex'));
        var toSend = this.responsesToSend.shift();
        if (toSend && typeof toSend === 'string') {
            switch (toSend) {
                case 'disconnect':
                    break;
                case 'error':
                    break;
                default:
                    this.conn.write(toSend, 'utf8', function() { debug('Wrote ' + toSend); });
            }
        } else if (toSend) {
            this.conn.write(toSend);
        } else {
            debug('Received and validated data, but nothing to send back.');
        }
    }
};

MockServer.prototype.assertSequence = function(doneCB, timeout) {
    var timeoutInMillis = timeout || 1000;
    setTimeout(function() {
        doneCB();
    }, timeoutInMillis);
};

module.exports = MockServer;
