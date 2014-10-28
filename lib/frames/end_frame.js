var debug       = require('debug')('amqp10-end_frame'),
    util        = require('util'),

    constants   = require('./../constants'),
    FrameBase   = require('./frame');

/**
 * <h2>end performative</h2>
 * <i>end the Session</i>
 * <p>Indicates that the Session has ended.</p>
 * <h3>Descriptor</h3>
 * <dl>
 * <dt>Name</dt>
 * <dd>amqp:end:list</dd>
 * <dt>Code</dt>
 * <dd>0x00000000:0x00000017</dd>
 * </dl>
 *
 * <table>
 * <tr><th>Name</th><th>Type</th><th>Mandatory?</th></tr><tr><td>error</td><td>error</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="2"><i>error causing the end</i>
 * <p>
 *             If set, this field indicates that the Session is being ended due to an error condition.
 *             The value of the field should contain details on the cause of the error.
 *           </p></td></tr>
 * </table>
 *
 * @constructor
 */
var EndFrame = function() {

};

util.inherits(EndFrame, FrameBase.AMQPFrame);