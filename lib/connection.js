var btools      = require('buffertools'),
    cbuf        = require('cbarrick-circular-buffer'),
    debug       = require('debug')('amqp10-Connection'),
    net         = require('net'),
    StateMachine= require('stately.js'),

    constants   = require('./constants'),
    codec       = require('./codec'),
    exceptions  = require('./exceptions'),

    AMQPError   = require('./types/amqp_error'),
    DescribedType   = require('./types/described_type'),

    FrameReader = require('./frames/frame_reader'),
    CloseFrame  = require('./frames/close_frame'),
    OpenFrame   = require('./frames/open_frame');

/**
 * Connection states, from AMQP 1.0 spec:
 *
 <dl>
 <dt>START</dt>
 <dd><p>In this state a Connection exists, but nothing has been sent or received. This is the
 state an implementation would be in immediately after performing a socket connect or
 socket accept.</p></dd>

 <dt>HDR_RCVD</dt>
 <dd><p>In this state the Connection header has been received from our peer, but we have not
 yet sent anything.</p></dd>

 <dt>HDR_SENT</dt>
 <dd><p>In this state the Connection header has been sent to our peer, but we have not yet
 received anything.</p></dd>

 <dt>OPEN_PIPE</dt>
 <dd><p>In this state we have sent both the Connection header and the open frame, but we have not yet received anything.
 </p></dd>

 <dt>OC_PIPE</dt>
 <dd><p>In this state we have sent the Connection header, the open
 frame, any pipelined Connection traffic, and the close frame,
 but we have not yet received anything.</p></dd>

 <dt>OPEN_RCVD</dt>
 <dd><p>In this state we have sent and received the Connection header, and received an
 open frame from our peer, but have not yet sent an
 open frame.</p></dd>

 <dt>OPEN_SENT</dt>
 <dd><p>In this state we have sent and received the Connection header, and sent an
 open frame to our peer, but have not yet received an
 open frame.</p></dd>

 <dt>CLOSE_PIPE</dt>
 <dd><p>In this state we have send and received the Connection header, sent an
 open frame, any pipelined Connection traffic, and the
 close frame, but we have not yet received an
 open frame.</p></dd>

 <dt>OPENED</dt>
 <dd><p>In this state the Connection header and the open frame
 have both been sent and received.</p></dd>

 <dt>CLOSE_RCVD</dt>
 <dd><p>In this state we have received a close frame indicating
 that our partner has initiated a close. This means we will never have to read anything
 more from this Connection, however we can continue to write frames onto the Connection.
 If desired, an implementation could do a TCP half-close at this point to shutdown the
 read side of the Connection.</p></dd>

 <dt>CLOSE_SENT</dt>
 <dd><p>In this state we have sent a close frame to our partner.
 It is illegal to write anything more onto the Connection, however there may still be
 incoming frames. If desired, an implementation could do a TCP half-close at this point
 to shutdown the write side of the Connection.</p></dd>

 <dt>DISCARDING</dt>
 <dd><p>The DISCARDING state is a variant of the CLOSE_SENT state where the
 close is triggered by an error. In this case any incoming frames on
 the connection MUST be silently discarded until the peer's close frame
 is received.</p></dd>

 <dt>END</dt>
 <dd><p>In this state it is illegal for either endpoint to write anything more onto the
 Connection. The Connection may be safely closed and discarded.</p></dd>
 </dl>
 *
 * Connection negotiation state diagram from AMQP 1.0 spec:
 *
 <pre>
              R:HDR +=======+ S:HDR             R:HDR[!=S:HDR]
           +--------| START |-----+    +--------------------------------+
           |        +=======+     |    |                                |
          \|/                    \|/   |                                |
      +==========+             +==========+ S:OPEN                      |
 +----| HDR-RCVD |             | HDR-SENT |------+                      |
 |    +==========+             +==========+      |      R:HDR[!=S:HDR]  |
 |   S:HDR |                      | R:HDR        |    +-----------------+
 |         +--------+      +------+              |    |                 |
 |                 \|/    \|/                   \|/   |                 |
 |                +==========+               +-----------+ S:CLOSE      |
 |                | HDR-EXCH |               | OPEN-PIPE |----+         |
 |                +==========+               +-----------+    |         |
 |           R:OPEN |      | S:OPEN              | R:HDR      |         |
 |         +--------+      +------+      +-------+            |         |
 |        \|/                    \|/    \|/                  \|/        |
 |   +===========+             +===========+ S:CLOSE       +---------+  |
 |   | OPEN-RCVD |             | OPEN-SENT |-----+         | OC-PIPE |--+
 |   +===========+             +===========+     |         +---------+  |
 |  S:OPEN |                      | R:OPEN      \|/           | R:HDR   |
 |         |       +========+     |          +------------+   |         |
 |         +----- >| OPENED |< ---+          | CLOSE-PIPE |< -+         |
 |                 +========+                +------------+             |
 |           R:CLOSE |    | S:CLOSE              | R:OPEN               |
 |         +---------+    +-------+              |                      |
 |        \|/                    \|/             |                      |
 |   +============+          +=============+     |                      |
 |   | CLOSE-RCVD |          | CLOSE-SENT* |< ---+                      |
 |   +============+          +=============+                            |
 | S:CLOSE |                      | R:CLOSE                             |
 |         |         +=====+      |                                     |
 |         +------- >| END |< ----+                                     |
 |                   +=====+                                            |
 |                     /|\                                              |
 |    S:HDR[!=R:HDR]    |                R:HDR[!=S:HDR]                 |
 +----------------------+-----------------------------------------------+

 </pre>
 *
 * R:<b>CTRL</b> = Received <b>CTRL</b>
 *
 * S:<b>CTRL</b> = Sent <b>CTRL</b>
 *
 * Also could be DISCARDING if an error condition triggered the CLOSE
 *
 * @constructor
 */
var Connection = function (options) {
    exceptions.assertArguments(options, [ 'container_id', 'hostname' ]);
    this.addressRegex = new RegExp('(amqps?)://([^:/]+)(?::([0-9]+))?(/.*)?');
    this.client = null;
    this.connectedTo = null;
    this.curbuf = new cbuf({ size: 1024, encoding: 'buffer' });
    this.dataHandler = null;
    this.connectionParams = {
        container_id: options.container_id,
        hostname: options.hostname,
        max_frame_size: options.max_frame_size || constants.default_max_frame_size,
        channel_max: options.channel_max || constants.default_channel_max,
        idle_time_out: options.idle_time_out || constants.default_idle_time_out_in_ms,
        outgoing_locales: options.outgoing_locales || constants.default_outgoing_locales,
        incoming_locales: options.incoming_locales || constants.default_incoming_locales
    };
    var self = this;
    var stateMachine = {
        'DISCONNECTED': {
            connect: function(address) {
                self._connect(address);
                return this.START;
            }
        },
        'START': {
            connected: function() {
                self._sendHeader();
                return this.HDR_SENT;
            },
            headerReceived: function() { return this.HDR_RCVD; }
        },
        'HDR_RCVD': {
            validVersion: function() {
                self._sendHeader();
                return this.HDR_EXCH;
            },
            invalidVersion: function() {
                self._terminate();
                return this.DISCONNECTING;
            }
        },
        'HDR_SENT': {
            validVersion: function() {
                return this.HDR_EXCH;
            },
            invalidVersion: function() {
                self._terminate();
                return this.DISCONNECTING;
            }
        },
        'HDR_EXCH': {
            sendOpen: function() {
                self.dataHandler = self._receiveOpenFrame;
                self._sendOpenFrame();
                return this.OPEN_SENT;
            },
            openReceived: function() {
                self.dataHandler = self._receiveAny;
                return this.OPEN_RCVD;
            }
        },
        'OPEN_RCVD': {
            sendOpen: function() {
                self._sendOpenFrame();
                return this.OPENED;
            }
        },
        'OPEN_SENT': {
            openReceived: function() {
                self.dataHandler = self._receiveAny;
                return this.OPENED;
            }
        },
        'OPENED': {
            closeReceived: function() {
                return this.CLOSE_RCVD;
            },
            invalidOptions: function() {
                self._sendCloseFrame(new AMQPError(AMQPError.ConnectionForced, 'Invalid options'));
                self.dataHandler = self._receiveCloseFrame;
                return this.CLOSE_SENT;
            }
        },
        'CLOSE_RCVD': {
            sendClose: function() {
                self._sendCloseFrame();
                self._terminate();
                return this.DISCONNECTED;
            }
        },
        'CLOSE_SENT': {
            closeReceived: function() {
                self._terminate();
                return this.DISCONNECTED;
            },
            disconnect: function() { return this.DISCONNECTED; }
        },
        'DISCONNECTING': {
            disconnected: function() {
                return this.DISCONNECTED;
            }
        }
    };

    var errorHandler = function(err) { self._processError(err); return this.DISCONNECTED; };
    var terminationHandler = function() { self._terminate(); return this.DISCONNECTED; };
    Object.keys(stateMachine).forEach(function (state) {
        if (state !== 'DISCONNECTED') {
            stateMachine[state].error = errorHandler;
            stateMachine[state].terminated = terminationHandler;
        }
    });

    this.connSM = new StateMachine(stateMachine).bind(function(event, oldState, newState) {
        debug('Transitioning from '+oldState+' to '+newState+' due to '+event);
    });
};

Connection.prototype._processError = function(err) {
    console.warn('Error from socket: '+err);
    // TODO: Cleanly close on error
    this._terminate();
};

Connection.prototype._receiveData = function(buffer) {
    debug('Rx: ' + buffer.toString('hex'));
    this.curbuf.write(buffer);
    if (this.dataHandler) {
        this.dataHandler();
    }
};

Connection.prototype._sendHeader = function() {
    this.client.write(constants.amqp_version);
};

Connection.prototype._receiveHeader = function() {
    if (this.curbuf.length >= constants.amqp_version.length) {
        var serverVersion = this.curbuf.read(8);
        debug('Server AMQP Version: ' + serverVersion.toString('hex') + ' vs ' + constants.amqp_version.toString('hex'));
        if (this.connSM.getMachineState() === 'START') {
            this.connSM.headerReceived();
        }

        if (btools.equals(serverVersion, constants.amqp_version)) {
            this.connSM.validVersion();
            this.connSM.sendOpen();
        } else {
            this.connSM.invalidVersion();
        }
    }
};

Connection.prototype._sendOpenFrame = function() {
    var openFrame = new OpenFrame(this.connectionParams);
    var frameBuf = openFrame.outgoing();
    debug('Sending OPEN: ' + frameBuf.toString('hex'));
    this.client.write(frameBuf);
};

Connection.prototype._tryReceiveFrame = function() {
    try {
        var frame = FrameReader.read(this.curbuf);
        if (frame === undefined) {
            debug('Not enough frame');
        } else {
            debug('Matched frame!');
            debug(JSON.stringify(frame));
        }
        return frame;
    } catch (e) {
        console.warn(e.message);
    }
};

Connection.prototype._ensureLocaleCompatibility = function(lhsLocales, rhsLocales) {
    return true;
};

Connection.prototype._receiveOpenFrame = function() {
    var frame = this._tryReceiveFrame();
    if (frame) {
        if (frame instanceof OpenFrame) {
            this.connSM.openReceived();
            if (this.connSM.getMachineState() === 'OPEN_RCVD') {
                this.connSM.sendOpen();
            }

            var valid = true;
            if (frame.max_frame_size) this.connectionParams.max_frame_size = Math.min(this.connectionParams.max_frame_size, frame.max_frame_size);
            if (frame.channel_max) this.connectionParams.channel_max = Math.min(this.connectionParams.channel_max, frame.channel_max);
            if (frame.idle_time_out) this.idle_time_out = Math.min(this.connectionParams.idle_time_out, frame.idle_time_out);
            if (frame.outgoing_locales) {
                valid = valid && this._ensureLocaleCompatibility(this.connectionParams.incoming_locales, frame.outgoing_locales);
            }
            if (frame.incoming_locales) {
                valid = valid && this._ensureLocaleCompatibility(this.connectionParams.outgoing_locales, frame.incoming_locales);
            }

            if (!valid) {
                this.connSM.invalidOptions();
            } else {
                // We're connected.
            }
        } else {
            console.warn('Received ' + JSON.stringify(frame) + ' when expecting OpenFrame!');
        }
    }
};

Connection.prototype._sendCloseFrame = function(err) {
    var closeFrame = new CloseFrame(err);
    var frameBuf = closeFrame.outgoing();
    debug('Sending CLOSE: ' + frameBuf.toString('hex'));
    this.client.write(frameBuf);
};

Connection.prototype._receiveAny = function() {
    var frame = this._tryReceiveFrame();
    if (frame) {
        debug('Received frame: ' + JSON.stringify(frame));
    }
};

Connection.prototype._receiveCloseFrame = function() {
    var frame = this._tryReceiveFrame();
    if (frame && frame instanceof CloseFrame) {
        this.connSM.closeReceived();
    } else if (frame) {
        debug('Closing, so ignoring frame ' + JSON.stringify(frame));
    }
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

Connection.prototype._connect = function(address) {
    var parsedAddress = this._parseAddress(address);
    var self = this;
    self.connectedTo = address;
    self.dataHandler = self._receiveHeader;
    self.client = net.connect({ port: parsedAddress.port, host: parsedAddress.host });
    self.client.on('connect', function() {
        self.connSM.connected();
    }).on('data', function(buf) {
        self._receiveData(buf);
    }).on('error', function(err) {
        self.connSM.error(err);
    }).on('end', function() {
        self.connSM.terminated();
    });
};

Connection.prototype._terminate = function() {
    if (this.client) {
        this.connectedTo = null;
        this.client.end();
        this.client = null;
    }
};

Connection.prototype.open = function(address) {
    this.connSM.connect(address);
};

Connection.prototype.close = function() {
    // TODO: Cleanly close connections.
    this.connSM.terminated();
};

module.exports = Connection;