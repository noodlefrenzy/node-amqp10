'use strict';

var util = require('util'),
    u = require('../utilities'),
    up = u.payload,

    DescribedType = require('../types/described_type'),
    ForcedType = require('../types/forced_type'),

    FrameBase = require('./frame'),
    Codec = require('../codec'),
    errors = require('../errors'),
    M = require('../types/message');


/**
 * <h2>transfer performative</h2>
 * <i>transfer a Message</i>
 * <p>
 *           The transfer frame is used to send Messages across a Link. Messages may be carried by a
 *           single transfer up to the maximum negotiated frame size for the Connection. Larger
 *           Messages may be split across several transfer frames.
 *         </p>
 * <h3>Descriptor</h3>
 * <dl>
 * <dt>Name</dt>
 * <dd>amqp:transfer:list</dd>
 * <dt>Code</dt>
 * <dd>0x00000000:0x00000014</dd>
 * </dl>
 *
 * <table border="1">
 * <tr><th>Name</th><th>Type</th><th>Mandatory?</th><th>Multiple?</th></tr><tr><td>handle</td><td>handle</td><td>true</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="3">undefined
 * <p>Specifies the Link on which the Message is transferred.</p></td></tr>
 * <tr><td>delivery-id</td><td>delivery-number</td><td>false</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="3"><i>alias for delivery-tag</i>
 * <p>
 *             The delivery-id MUST be supplied on the first transfer of a multi-transfer delivery. On
 *             continuation transfers the delivery-id MAY be omitted. It is an error if the delivery-id
 *             on a continuation transfer differs from the delivery-id on the first transfer of a
 *             delivery.
 *           </p></td></tr>
 * <tr><td>delivery-tag</td><td>delivery-tag</td><td>false</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="3">undefined
 * <p>
 *             Uniquely identifies the delivery attempt for a given Message on this Link. This field
 *             MUST be specified for the first transfer of a multi transfer message and may only be
 *             omitted for continuation transfers.
 *           </p></td></tr>
 * <tr><td>message-format</td><td>message-format</td><td>false</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="3"><i>indicates the message format</i>
 * <p>
 *             This field MUST be specified for the first transfer of a multi transfer message and may
 *             only be omitted for continuation transfers.
 *           </p></td></tr>
 * <tr><td>settled</td><td>boolean</td><td>false</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="3">undefined
 * <p>
 *              If not set on the first (or only) transfer for a delivery, then the settled flag MUST
 *              be interpreted as being false. For subsequent transfers if the settled flag is left
 *              unset then it MUST be interpreted as true if and only if the value of the settled flag
 *              on any of the preceding transfers was true; if no preceding transfer was sent with
 *              settled being true then the value when unset MUST be taken as false.
 *           </p>
 * <p>
 *              If the negotiated value for snd-settle-mode at attachment is , then this field MUST be true on at least
 *              one transfer frame for a delivery (i.e. the delivery must be settled at the Sender at
 *              the point the delivery has been completely transferred).
 *           </p>
 * <p>sender-settle-mode</p>
 * <p>
 *              If the negotiated value for snd-settle-mode at attachment is , then this field MUST be false (or
 *              unset) on every transfer frame for a delivery (unless the delivery is aborted).
 *           </p>
 * <p>sender-settle-mode</p></td></tr>
 * <tr><td>more</td><td>boolean</td><td>false</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="3"><i>indicates that the Message has more content</i>
 * <p>
 *             Note that if both the more and aborted fields are set to true, the aborted flag takes
 *             precedence. That is a receiver should ignore the value of the more field if the
 *             transfer is marked as aborted. A sender SHOULD NOT set the more flag to true if it
 *             also sets the aborted flag to true.
 *           </p></td></tr>
 * <tr><td>rcv-settle-mode</td><td>receiver-settle-mode</td><td>false</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="3">undefined
 * <p>
 *             If , this indicates that the
 *             Receiver MUST settle the delivery once it has arrived without waiting for the Sender to
 *             settle first.
 *           </p>
 * <p>receiver-settle-mode</p>
 * <p>
 *             If , this indicates that the
 *             Receiver MUST NOT settle until sending its disposition to the Sender and receiving a
 *             settled disposition from the sender.
 *           </p>
 * <p>receiver-settle-mode</p>
 * <p>
 *             If not set, this value is defaulted to the value negotiated on link attach.
 *           </p>
 * <p>
 *             If the negotiated link value is ,
 *             then it is illegal to set this field to .
 *           </p>
 * <p>receiver-settle-mode</p>
 * <p>
 *             If the message is being sent settled by the Sender, the value of this field is ignored.
 *           </p>
 * <p>
 *             The (implicit or explicit) value of this field does not form part of the transfer state,
 *             and is not retained if a link is suspended and subsequently resumed.
 *           </p></td></tr>
 * <tr><td>state</td><td>*</td><td>false</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="3"><i>the state of the delivery at the sender</i>
 * <p>
 *             When set this informs the receiver of the state of the delivery at the sender. This is
 *             particularly useful when transfers of unsettled deliveries are resumed after a resuming
 *             a link. Setting the state on the transfer can be thought of as being equivalent to
 *             sending a disposition immediately before the  performative, i.e.
 *             it is the state of the delivery (not the transfer) that existed at the point the frame
 *             was sent.
 *           </p>
 * <p>transfer</p>
 * <p>
 *             Note that if the  performative (or an earlier  performative referring to the delivery) indicates that the delivery
 *             has attained a terminal state, then no future  or  sent by the sender can alter that terminal state.
 *           </p>
 * <p>transfer</p></td></tr>
 * <tr><td>resume</td><td>boolean</td><td>false</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="3"><i>indicates a resumed delivery</i>
 * <p>
 *             If true, the resume flag indicates that the transfer is being used to reassociate an
 *             unsettled delivery from a dissociated link endpoint. See
 *              for more details.
 *           </p>
 * <p>resuming-deliveries</p>
 * <p>
 *             The receiver MUST ignore resumed deliveries that are not in its local unsettled map. The
 *             sender MUST NOT send resumed transfers for deliveries not in its local unsettled map.
 *           </p>
 * <p>
 *             If a resumed delivery spans more than one transfer performative, then the resume flag
 *             MUST be set to true on the first transfer of the resumed delivery.  For subsequent
 *             transfers for the same delivery the resume flag may be set to true, or may be omitted.
 *           </p>
 * <p>
 *             In the case where the exchange of unsettled maps makes clear that all message data has
 *             been successfully transferred to the receiver, and that only the final state (and
 *             potentially settlement) at the sender needs to be conveyed, then a resumed delivery may
 *             carry no payload and instead act solely as a vehicle for carrying the terminal state of
 *             the delivery at the sender.
 *            </p></td></tr>
 * <tr><td>aborted</td><td>boolean</td><td>false</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="3"><i>indicates that the Message is aborted</i>
 * <p>
 *             Aborted Messages should be discarded by the recipient (any payload within the frame
 *             carrying the performative MUST be ignored). An aborted Message is implicitly settled.
 *           </p></td></tr>
 * <tr><td>batchable</td><td>boolean</td><td>false</td><td>false</td></tr>
 * <tr><td>&nbsp;</td><td colspan="3"><i>batchable hint</i>
 * <p>
 *             If true, then the issuer is hinting that there is no need for the peer to urgently
 *             communicate updated delivery state. This hint may be used to artificially increase the
 *             amount of batching an implementation uses when communicating delivery states, and
 *             thereby save bandwidth.
 *           </p>
 * <p>
 *             If the message being delivered is too large to fit within a single frame, then the
 *             setting of batchable to true on any of the  performatives for the
 *             delivery is equivalent to setting batchable to true for all the
 *             performatives for the delivery.
 *           </p>
 * <p>transfer</p>
 * <p>
 *             The batchable value does not form part of the transfer state, and is not retained if
 *             a link is suspended and subsequently resumed.
 *           </p></td></tr>
 * </table>
 *
 * @constructor
 */
function TransferFrame(options) {
  options = options || {};
  TransferFrame.super_.call(this, options.channel);
  if (options instanceof DescribedType) {
    this.fromDescribedType(options);
    return;
  }

  u.assertArguments(options, ['handle']);
  u.defaults(this, options, {
    deliveryId: null,
    deliveryTag: null,
    messageFormat: 0,
    settled: null,
    more: false,
    receiverSettleMode: null,
    state: null,
    resume: false,
    aborted: false,
    batchable: false
  });
}

util.inherits(TransferFrame, FrameBase.AMQPFrame);

TransferFrame.prototype.Descriptor = { code: 0x14, name: 'amqp:transfer:list' };
TransferFrame.prototype.EncodeOrdering = [
  'handle', 'deliveryId', 'deliveryTag', 'messageFormat', 'settled', 'more',
  'receiverSettleMode', 'state', 'resume', 'aborted', 'batchable'
];

// used to determine if a message should be split to multiple frames
TransferFrame.FRAME_OVERHEAD = 29;

TransferFrame.prototype.toDescribedType = function() {
  var self = this;
  return new DescribedType(TransferFrame, {
    handle: new ForcedType('uint', self.handle),
    deliveryId: new ForcedType('uint', self.deliveryId),
    deliveryTag: self.deliveryTag,
    messageFormat: new ForcedType('uint', self.messageFormat),
    settled: self.settled,
    more: self.more,
    receiverSettleMode: new ForcedType('ubyte', self.receiverSettleMode),
    state: self.state,
    resume: self.resume,
    aborted: self.aborted,
    batchable: self.batchable,
    encodeOrdering: TransferFrame.prototype.EncodeOrdering
  });
};

TransferFrame.prototype.fromDescribedType = function(describedType) {
  up.assert(describedType, 0, 'handle');

  u.assignFromDescribedType(TransferFrame, describedType, this, {
    more: false,
    resume: false,
    aborted: false,
    batchable: false
  });
};

TransferFrame._possibleFields = {
  'header': M.Header, 'footer': M.Footer, 'deliveryAnnotations': M.DeliveryAnnotations,
  'annotations': M.Annotations, 'properties': M.Properties, 'applicationProperties': M.ApplicationProperties
};

/**
 * An AMQP Message is composed of:
 *
 * * Zero or one header
 * * Zero or one delivery-annotations
 * * Zero or one message-annotations
 * * Zero or one properties
 * * Zero or one application-properties
 * * Body: One or more data sections, one or more amqp-sequence sections, or one amqp-value section
 * * Zero or one footer
 *
 * @return {Message}               Complete message object decoded from buffer
 */
TransferFrame.prototype.decodePayload = function() {
  var message = new M.Message();
  var body = [];
  var curIdx = 0;
  var isData = function(x) { return x instanceof M.Data; };
  var isSequence = function(x) { return x instanceof M.AMQPSequence; };
  var buffer = this.message;
  while (curIdx < buffer.length) {
    var decoded = Codec.decode(buffer, curIdx);
    if (!decoded) throw new errors.MalformedPayloadError(
      'Unable to decode bytes from message body: ' + buffer.slice(curIdx).toString('hex'));
    curIdx += decoded[1];
    var matched = false;
    for (var fieldName in TransferFrame._possibleFields) {
      if (decoded[0] instanceof TransferFrame._possibleFields[fieldName]) {
        if (message.hasOwnProperty(fieldName)) throw new errors.MalformedPayloadError('Duplicate ' + fieldName + ' section in message');
        message[fieldName] = decoded[0];
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Part of the body
      if (decoded[0] instanceof M.Data) {
        if (body.length && !body.every(isData)) throw new errors.MalformedPayloadError(
          'Attempt to put both Data and non-Data payloads in message body');
        body.push(decoded[0]);
      } else if (decoded[0] instanceof M.AMQPSequence) {
        if (body.length && !body.every(isSequence)) throw new errors.MalformedPayloadError(
          'Attempt to put both AMQPSequence and non-AMQPSequence payloads in message body');
        body.push(decoded[0]);
      } else if (decoded[0] instanceof M.AMQPValue) {
        if (body.length) throw new errors.MalformedPayloadError('Attempt to provide more than one AMQPValue for message body');
        body.push(decoded[0]);
      } else {
        throw new errors.MalformedPayloadError('Unknown message contents: ' + JSON.stringify(decoded[0]));
      }
    }
  }
  // Pull out the values.
  message.body = body.map(function(x) { return x.getValue(); });

  return message;
};

module.exports = TransferFrame;
