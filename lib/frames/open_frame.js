var debug       = require('debug')('amqp10-open_frame'),
    util        = require('util'),

    constants   = require('./../constants'),
    Frame       = require('./frame');


/**
 * <h2>open performative</h2>
 * <i>negotiate Connection parameters</i>
 * <p>
 *           The first frame sent on a connection in either direction MUST contain an Open body. (Note
 *           that the Connection header which is sent first on the Connection is *not* a frame.) The
 *           fields indicate the capabilities and limitations of the sending peer.
 *         </p>
 * <h3>Descriptor</h3>
 * <dl>
 * <dt>Name</dt>
 * <dd>amqp:open:list</dd>
 * <dt>Code</dt>
 * <dd>0x00000000:0x00000010</dd>
 * </dl>
 *
 * <table>
 * <tr><th>Name</th><th>Type</th><th>Mandatory?</th></tr><tr><td>container-id</td><td>string</td><td>true</td></tr>
 * <tr><td>&nbsp;</td><td colspan="2"><i>the id of the source container</i></td></tr>
 * <tr><td>hostname</td><td>string</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="2"><i>the name of the target host</i>
 * <p>
 *             The dns name of the host (either fully qualified or relative) to which the sending peer
 *             is connecting. It is not mandatory to provide the hostname. If no hostname is provided
 *             the receiving peer should select a default based on its own configuration. This field
 *             can be used by AMQP proxies to determine the correct back-end service to connect
 *             the client to.
 *           </p>
 * <p>
 *             This field may already have been specified by the  frame, if a
 *             SASL layer is used, or, the server name indication extension as described in
 *             RFC-4366, if a TLS layer is used, in which case this field SHOULD be null or contain
 *             the same value. It is undefined what a different value to those already specific means.
 *           </p>
 * <p>sasl-init</p></td></tr>
 * <tr><td>max-frame-size</td><td>uint</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="2"><i>proposed maximum frame size</i>
 * <p>
 *             The largest frame size that the sending peer is able to accept on this Connection. If
 *             this field is not set it means that the peer does not impose any specific limit. A peer
 *             MUST NOT send frames larger than its partner can handle. A peer that receives an
 *             oversized frame MUST close the Connection with the framing-error error-code.
 *           </p>
 * <p>
 *             Both peers MUST accept frames of up to  octets
 *             large.
 *           </p>
 * <p>MIN-MAX-FRAME-SIZE</p></td></tr>
 * <tr><td>channel-max</td><td>ushort</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="2"><i>the maximum channel number that may be used on the Connection</i>
 * <p>
 *             The channel-max value is the highest channel number that may be used on the Connection.
 *             This value plus one is the maximum number of Sessions that can be simultaneously active
 *             on the Connection. A peer MUST not use channel numbers outside the range that its
 *             partner can handle. A peer that receives a channel number outside the supported range
 *             MUST close the Connection with the framing-error error-code.
 *           </p></td></tr>
 * <tr><td>idle-time-out</td><td>milliseconds</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="2"><i>idle time-out</i>
 * <p>
 *             The idle time-out required by the sender. A value of zero is the same as if it was
 *             not set (null). If the receiver is unable or unwilling to support the idle time-out
 *             then it should close the connection with an error explaining why (eg, because it is
 *             too small).
 *           </p>
 * <p>
 *             If the value is not set, then the sender does not have an idle time-out. However,
 *             senders doing this should be aware that implementations MAY choose to use an
 *             internal default to efficiently manage a peer's resources.
 *           </p></td></tr>
 * <tr><td>outgoing-locales</td><td>ietf-language-tag</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="2"><i>locales available for outgoing text</i>
 * <p>
 *             A list of the locales that the peer supports for sending informational text. This
 *             includes Connection, Session and Link error descriptions. A peer MUST support at least
 *             the  locale (see ). Since this value is
 *             always supported, it need not be supplied in the outgoing-locales. A null value or an
 *             empty list implies that only  is supported.
 *           </p>
 * <p>ietf-language-tag</p></td></tr>
 * <tr><td>incoming-locales</td><td>ietf-language-tag</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="2"><i>desired locales for incoming text in decreasing level of preference</i>
 * <p>
 *             A list of locales that the sending peer permits for incoming informational text. This
 *             list is ordered in decreasing level of preference. The receiving partner will chose the
 *             first (most preferred) incoming locale from those which it supports. If none of the
 *             requested locales are supported,  will be chosen. Note that
 *             need not be supplied in this list as it is always the fallback. A peer may determine
 *             which of the permitted incoming locales is chosen by examining the partner's supported
 *             locales as specified in the outgoing-locales field. A null value or an empty list
 *             implies that only  is supported.
 *           </p></td></tr>
 * <tr><td>offered-capabilities</td><td>symbol</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="2"><i>the extension capabilities the sender supports</i>
 * <p>
 *             If the receiver of the offered-capabilities requires an extension capability which is
 *             not present in the offered-capability list then it MUST close the connection.
 *           </p>
 * <p>
 *             A list of commonly defined connection capabilities and their meanings can be found here:
 *             .
 *           </p>
 * <p>http://www.amqp.org/specification/1.0/connection-capabilities</p></td></tr>
 * <tr><td>desired-capabilities</td><td>symbol</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="2"><i>the extension capabilities the sender may use if the receiver supports them</i>
 * <p>
 *             The desired-capability list defines which extension capabilities the sender MAY use if
 *             the receiver offers them (i.e. they are in the offered-capabilities list received by the
 *             sender of the desired-capabilities). If the receiver of the desired-capabilities offers
 *             extension capabilities which are not present in the desired-capability list it received,
 *             then it can be sure those (undesired) capabilities will not be used on the
 *             Connection.
 *           </p></td></tr>
 * <tr><td>properties</td><td>fields</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="2"><i>connection properties</i>
 * <p>
 *             The properties map contains a set of fields intended to indicate information about the
 *             connection and its container.
 *           </p>
 * <p>
 *             A list of commonly defined connection properties and their meanings can be found here:
 *
 *           </p>
 * <p>http://www.amqp.org/specification/1.0/connection-properties</p></td></tr>
 * </table>
 *
 * @constructor
 */
var OpenFrame = function() {

};

OpenFrame.prototype.outgoing = function() {
    this._buildOutgoing({ channel: 0x0, frameType: constants.frame_type.amqp });
};

util.inherits(OpenFrame, Frame);