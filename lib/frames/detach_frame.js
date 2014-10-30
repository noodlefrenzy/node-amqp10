var debug       = require('debug')('amqp10-detach_frame'),
    util        = require('util'),

    constants   = require('./../constants'),
    FrameBase   = require('./frame');

/**
 * <h2>detach performative</h2>
 * <i>detach the Link Endpoint from the Session</i>
 * <p>
 *           Detach the Link Endpoint from the Session. This un-maps the handle and makes it available
 *           for use by other Links.
 *         </p>
 * <h3>Descriptor</h3>
 * <dl>
 * <dt>Name</dt>
 * <dd>amqp:detach:list</dd>
 * <dt>Code</dt>
 * <dd>0x00000000:0x00000016</dd>
 * </dl>
 *
 * <table border="1">
 * <tr><th>Name</th><th>Type</th><th>Mandatory?</th><th>Multiple?</th></tr><tr><td>handle</td><td>handle</td><td>true</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="3"><i>the local handle of the link to be detached</i></td></tr>
 * <tr><td>closed</td><td>boolean</td><td>false</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="3"><i>if true then the sender has closed the link</i>
 * <p>See .</p>
 * <p>closing-a-link</p></td></tr>
 * <tr><td>error</td><td>error</td><td>false</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="3"><i>error causing the detach</i>
 * <p>
 *             If set, this field indicates that the Link is being detached due to an error condition.
 *             The value of the field should contain details on the cause of the error.
 *           </p></td></tr>
 * </table>
 *
 * @constructor
 */
var DetachFrame = function() {

};

util.inherits(DetachFrame, FrameBase.AMQPFrame);