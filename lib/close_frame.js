var debug       = require('debug')('amqp10-close_frame'),
    util        = require('util'),

    constants   = require('./constants'),
    Frame       = require('./frame');

/**
 * <h2>close performative</h2>
 * <i>signal a Connection close</i>
 * <p>
 *           Sending a close signals that the sender will not be sending any more frames (or bytes of
 *           any other kind) on the Connection. Orderly shutdown requires that this frame MUST be
 *           written by the sender. It is illegal to send any more frames (or bytes of any other kind)
 *           after sending a close frame.
 *         </p>
 * <h3>Descriptor</h3>
 * <dl>
 * <dt>Name</dt>
 * <dd>amqp:close:list</dd>
 * <dt>Code</dt>
 * <dd>0x00000000:0x00000018</dd>
 * </dl>
 *
 * <table>
 * <tr><th>Name</th><th>Type</th><th>Mandatory?</th></tr><tr><td>error</td><td>error</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="2"><i>error causing the close</i>
 * <p>
 *             If set, this field indicates that the Connection is being closed due to an error
 *             condition. The value of the field should contain details on the cause of the error.
 *           </p></td></tr>
 * </table>
 *
 * @constructor
 */
var CloseFrame = function() {

};

CloseFrame.prototype.outgoing = function() {
    this._buildOutgoing({ channel: 0x0, frameType: constants.frame_type.amqp });
};

util.inherits(CloseFrame, Frame);