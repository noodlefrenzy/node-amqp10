<a name="3.5.0"></a>
# [3.5.0](https://github.com/noodlefrenzy/node-amqp10/compare/v3.4.2...v3.5.0) (2017-03-07)


### Features

* **encoder:** introduce exported Encoder for easy type annotation ([0d7e2c3](https://github.com/noodlefrenzy/node-amqp10/commit/0d7e2c3))



<a name="3.4.2"></a>
## [3.4.2](https://github.com/noodlefrenzy/node-amqp10/compare/v3.4.1...v3.4.2) (2017-02-27)


### Bug Fixes

* **sender-link:** use spec-defined calculation for linkCredit ([373b736](https://github.com/noodlefrenzy/node-amqp10/commit/373b736))


### Features

* **sender-link:** add support for sending with no reply ([f0f267c](https://github.com/noodlefrenzy/node-amqp10/commit/f0f267c))



<a name="3.4.1"></a>
## [3.4.1](https://github.com/noodlefrenzy/node-amqp10/compare/v3.4.0...v3.4.1) (2017-02-07)


### Bug Fixes

* **amqp_error:** accept non-standard values for error-condition ([9a560d2](https://github.com/noodlefrenzy/node-amqp10/commit/9a560d2)), closes [#293](https://github.com/noodlefrenzy/node-amqp10/issues/293)
* **ServiceBusPolicy:** Avoid jsonifying Buffers ([0814658](https://github.com/noodlefrenzy/node-amqp10/commit/0814658))



<a name="3.4.0"></a>
# [3.4.0](https://github.com/noodlefrenzy/node-amqp10/compare/v3.3.2...v3.4.0) (2016-11-27)


### Bug Fixes

* **use:** throw an error if a plugin does not provide a function ([e50566a](https://github.com/noodlefrenzy/node-amqp10/commit/e50566a))


### Features

* **connection:** terminate connection when frame steam interrupted ([5455179](https://github.com/noodlefrenzy/node-amqp10/commit/5455179))
* **docs:** update documentation ([#282](https://github.com/noodlefrenzy/node-amqp10/issues/282)) ([39ed4ab](https://github.com/noodlefrenzy/node-amqp10/commit/39ed4ab))
* **sender-link:** add support for sending with no reply ([5e159a9](https://github.com/noodlefrenzy/node-amqp10/commit/5e159a9))



<a name="3.3.2"></a>
## [3.3.2](https://github.com/noodlefrenzy/node-amqp10/compare/v3.3.1...v3.3.2) (2016-10-27)


### Bug Fixes

* **connection:** don't require parameters for address on open ([1f7f2a0](https://github.com/noodlefrenzy/node-amqp10/commit/1f7f2a0))
* **policy:** remove sealing to allow extension of policy methods ([d0bdfc7](https://github.com/noodlefrenzy/node-amqp10/commit/d0bdfc7))
* **sender-link:** missing `Object.keys` around unsettled dispatch ([b0580b9](https://github.com/noodlefrenzy/node-amqp10/commit/b0580b9))
* **sender-link:** suppplement missing error in rejected dispo ([5c4f79a](https://github.com/noodlefrenzy/node-amqp10/commit/5c4f79a))
* **sender-link:** throw an error if there is no active connection ([e5bac49](https://github.com/noodlefrenzy/node-amqp10/commit/e5bac49))


### Features

* **policy:** move `parseLinkAddress` into `Policy` ([d1ae649](https://github.com/noodlefrenzy/node-amqp10/commit/d1ae649)), closes [#267](https://github.com/noodlefrenzy/node-amqp10/issues/267)



<a name="3.3.1"></a>
## [3.3.1](https://github.com/noodlefrenzy/node-amqp10/compare/v3.3.0...v3.3.1) (2016-10-20)


### Bug Fixes

* **deepMerge:** support copying Buffers ([db6295f](https://github.com/noodlefrenzy/node-amqp10/commit/db6295f)), closes [#268](https://github.com/noodlefrenzy/node-amqp10/issues/268)
* **sasl:** pass errors to callback, don't throw ([c5b11ee](https://github.com/noodlefrenzy/node-amqp10/commit/c5b11ee))



<a name="3.3.0"></a>
# [3.3.0](https://github.com/noodlefrenzy/node-amqp10/compare/v3.2.5...v3.3.0) (2016-10-18)


### Bug Fixes

* **connection:** use `connectPolicy` not `this.policy.connect` ([3a1d4a3](https://github.com/noodlefrenzy/node-amqp10/commit/3a1d4a3))
* **detach:** don't always reject promise if !close ([8c2e79e](https://github.com/noodlefrenzy/node-amqp10/commit/8c2e79e))
* **heartbeat:** local vs remote idleTimeouts ([8f20e2d](https://github.com/noodlefrenzy/node-amqp10/commit/8f20e2d))
* **MockAmqp:** process batch socket data ([51c16b3](https://github.com/noodlefrenzy/node-amqp10/commit/51c16b3))
* **sasl:** Make private saslMechanisms singular ([1ef4e17](https://github.com/noodlefrenzy/node-amqp10/commit/1ef4e17))
* **sender-link:** settle send promises on client disconnect ([98bd734](https://github.com/noodlefrenzy/node-amqp10/commit/98bd734))


### Features

* **ReceiverLink:** emit transfer frame optionally on `message` ([cd59fec](https://github.com/noodlefrenzy/node-amqp10/commit/cd59fec))
* **sasl:** Add support for SASL ANONYMOUS. ([d067202](https://github.com/noodlefrenzy/node-amqp10/commit/d067202)), closes [#250](https://github.com/noodlefrenzy/node-amqp10/issues/250)
* **types:** allow DescribedType as message.body ([b470e2b](https://github.com/noodlefrenzy/node-amqp10/commit/b470e2b))



<a name="3.2.5"></a>
## [3.2.5](https://github.com/noodlefrenzy/node-amqp10/compare/v3.2.4...v3.2.5) (2016-08-24)


### Bug Fixes

* **defaultSubjects:** throw error on invalid subjects ([314b495](https://github.com/noodlefrenzy/node-amqp10/commit/314b495))



<a name="3.2.4"></a>
## [3.2.4](https://github.com/noodlefrenzy/node-amqp10/compare/v3.2.3...v3.2.4) (2016-08-19)


### Bug Fixes

* **link:** emit `detached` event when force detached locally ([d2531ba](https://github.com/noodlefrenzy/node-amqp10/commit/d2531ba))



<a name="3.2.3"></a>
## [3.2.3](https://github.com/noodlefrenzy/node-amqp10/compare/v3.2.2...v3.2.3) (2016-08-11)


### Bug Fixes

* **encoding:** defaults for composite types should use type def ([8e76ae5](https://github.com/noodlefrenzy/node-amqp10/commit/8e76ae5))



<a name="3.2.2"></a>
## [3.2.2](https://github.com/noodlefrenzy/node-amqp10/compare/v3.2.1...v3.2.2) (2016-07-14)


### Bug Fixes

* **session:** force detach links in all possible active states ([3a7272d](https://github.com/noodlefrenzy/node-amqp10/commit/3a7272d))



<a name="3.2.1"></a>
## [3.2.1](https://github.com/noodlefrenzy/node-amqp10/compare/v3.2.0...v3.2.1) (2016-07-08)


### Bug Fixes

* **session:** ensure deep copies are made from policies ([2cb0797](https://github.com/noodlefrenzy/node-amqp10/commit/2cb0797))



<a name="3.2.0"></a>
# [3.2.0](https://github.com/noodlefrenzy/node-amqp10/compare/v3.1.6...v3.2.0) (2016-06-22)


### Features

* **connected-disconnected:** add signals for connection state ([4f8d4ff](https://github.com/noodlefrenzy/node-amqp10/commit/4f8d4ff))



<a name="3.1.6"></a>
## [3.1.6](https://github.com/noodlefrenzy/node-amqp10/compare/v3.1.5...v3.1.6) (2016-06-16)


### Bug Fixes

* **errors:** typo in utilities.wrapProtocolError, errorInfo => info ([91e229f](https://github.com/noodlefrenzy/node-amqp10/commit/91e229f))


### Features

* **ssl:** allow user to pass ssl options directly to transport ([68c4a91](https://github.com/noodlefrenzy/node-amqp10/commit/68c4a91))



<a name="3.1.5"></a>
## [3.1.5](https://github.com/noodlefrenzy/node-amqp10/compare/v3.1.4...v3.1.5) (2016-05-31)


### Bug Fixes

* **sender-link:** raw message payloads should merge link options ([8e48a3f](https://github.com/noodlefrenzy/node-amqp10/commit/8e48a3f))



<a name="3.1.4"></a>
## [3.1.4](https://github.com/noodlefrenzy/node-amqp10/compare/v3.1.3...v3.1.4) (2016-04-04)


### Features

* **dynamic-links:** prepend dynamic links with `dynamic_` ([69960e0](https://github.com/noodlefrenzy/node-amqp10/commit/69960e0))



<a name="3.1.3"></a>
## [3.1.3](https://github.com/noodlefrenzy/node-amqp10/compare/v3.1.2...v3.1.3) (2016-04-03)


### Bug Fixes

* **wrapProtocolError:** symbols are now plain strings ([8d3fb8b](https://github.com/noodlefrenzy/node-amqp10/commit/8d3fb8b))



<a name="3.1.2"></a>
## [3.1.2](https://github.com/noodlefrenzy/node-amqp10/compare/v3.1.1...v3.1.2) (2016-04-01)


### Bug Fixes

* **idleTimeout:** incorrect variable name for idleTimeout in frame ([8cb7e74](https://github.com/noodlefrenzy/node-amqp10/commit/8cb7e74))



<a name="3.1.1"></a>
## [3.1.1](https://github.com/noodlefrenzy/node-amqp10/compare/v3.1.0...v3.1.1) (2016-03-27)


### Features

* **use:** allow users to plugin Client behaviors ([8c7573f](https://github.com/noodlefrenzy/node-amqp10/commit/8c7573f))



<a name="3.1.0"></a>
# [3.1.0](https://github.com/noodlefrenzy/node-amqp10/compare/v3.0.0...v3.1.0) (2016-03-11)


### Bug Fixes

* **address-parsing:** support basic hostnames in address parsing ([757f0d2](https://github.com/noodlefrenzy/node-amqp10/commit/757f0d2))
* **application-properties:** make properties accessible ([ab8829a](https://github.com/noodlefrenzy/node-amqp10/commit/ab8829a))
* **attach-frame:** properly encode properties as AMQP fields type ([b9eb18f](https://github.com/noodlefrenzy/node-amqp10/commit/b9eb18f))
* **eh-integration:** refactor tests to fix after types refactor ([1dc2bd1](https://github.com/noodlefrenzy/node-amqp10/commit/1dc2bd1))
* **encoder:** encode message body's with 0 as a value ([9aa9f66](https://github.com/noodlefrenzy/node-amqp10/commit/9aa9f66))
* **frames:** consume bytes before heartbeat short circuit ([5f8b524](https://github.com/noodlefrenzy/node-amqp10/commit/5f8b524))
* **frames:** only consume buffer after successful frame type read ([3e54a73](https://github.com/noodlefrenzy/node-amqp10/commit/3e54a73))
* **link-reattach:** ensure sessions don't reattach after disconnect ([8eeeb5b](https://github.com/noodlefrenzy/node-amqp10/commit/8eeeb5b))
* **longs:** temporarily fix encoding longs in master ([c9e4810](https://github.com/noodlefrenzy/node-amqp10/commit/c9e4810))
* **multi-transfer:** fix issue with sending multi transfer frames ([6376e9d](https://github.com/noodlefrenzy/node-amqp10/commit/6376e9d))
* **session:** use console.warn instead of debug for warning message ([e7c6367](https://github.com/noodlefrenzy/node-amqp10/commit/e7c6367))
* **tools:** update formatting tool to accomodate new debug style ([b4c9567](https://github.com/noodlefrenzy/node-amqp10/commit/b4c9567))
* **translator:** ensure keys aren't objects for map types ([442e24c](https://github.com/noodlefrenzy/node-amqp10/commit/442e24c))
* **types:** fixed issues based on peer review ([2b00efc](https://github.com/noodlefrenzy/node-amqp10/commit/2b00efc))
* **types:** temporary paths for incorporating new types as known ([0b4a412](https://github.com/noodlefrenzy/node-amqp10/commit/0b4a412))
* **ulong:** decode smallulong and ulong0 as normal numbers ([b2416a0](https://github.com/noodlefrenzy/node-amqp10/commit/b2416a0))


### Features

* **receiver-stream:** add prototype for ReceiverStream ([d52b8f4](https://github.com/noodlefrenzy/node-amqp10/commit/d52b8f4))
* **sender-stream:** implement basic sender stream, add tests ([648a4b7](https://github.com/noodlefrenzy/node-amqp10/commit/648a4b7))



<a name="2.2.0"></a>
# [2.2.0](https://github.com/noodlefrenzy/node-amqp10/compare/v2.1.3...v2.2.0) (2015-12-10)


### Bug Fixes

* **long-ulong-decoding:** if we can represent it in js then do so ([04bfd67](https://github.com/noodlefrenzy/node-amqp10/commit/04bfd67))



<a name="2.1.3"></a>
## [2.1.3](https://github.com/noodlefrenzy/node-amqp10/compare/v2.0.0...v2.1.3) (2015-12-04)


### Bug Fixes

* **ActiveMQPolicy:** remove erroneous message about default idle ([3914a63](https://github.com/noodlefrenzy/node-amqp10/commit/3914a63))
* **addCredits:** don't return promise in ReceiverLink.addCredits ([04246cf](https://github.com/noodlefrenzy/node-amqp10/commit/04246cf))
* **auto-reattach:** temporarily disable blind auto reattaches ([2e1aa25](https://github.com/noodlefrenzy/node-amqp10/commit/2e1aa25))
* **cached-receivers:** resolve receiver links that already exist ([427e48d](https://github.com/noodlefrenzy/node-amqp10/commit/427e48d))
* **canSend:** move state check to canSend based on review ([06e0edc](https://github.com/noodlefrenzy/node-amqp10/commit/06e0edc))
* **client:** actually use the idleTimeout provided by the broker ([4e4b512](https://github.com/noodlefrenzy/node-amqp10/commit/4e4b512))
* **client:** clean up create[Sender,Receiver] preconditions, style ([5809f68](https://github.com/noodlefrenzy/node-amqp10/commit/5809f68))
* **client:** connect promise should resolve if reconnect is needed ([faef9a7](https://github.com/noodlefrenzy/node-amqp10/commit/faef9a7)), closes [#190](https://github.com/noodlefrenzy/node-amqp10/issues/190)
* **client:** only listen for Session.Mapped once during connect ([0cfd687](https://github.com/noodlefrenzy/node-amqp10/commit/0cfd687))
* **client:** remove deprecated _pendingSends ([9ffe830](https://github.com/noodlefrenzy/node-amqp10/commit/9ffe830))
* **client:** remove deprecated _sendMsgId ([bfd1910](https://github.com/noodlefrenzy/node-amqp10/commit/bfd1910))
* **client:** remove deprecated _unsettledSends ([ed6c225](https://github.com/noodlefrenzy/node-amqp10/commit/ed6c225))
* **Client:** set connect options hostname to vhost if it exists ([119bf49](https://github.com/noodlefrenzy/node-amqp10/commit/119bf49))
* **client-test:** remove unneeded send parameter ([43609fd](https://github.com/noodlefrenzy/node-amqp10/commit/43609fd))
* **codec:** encode Modified state, throw error on invalid type ([271415c](https://github.com/noodlefrenzy/node-amqp10/commit/271415c)), closes [#176](https://github.com/noodlefrenzy/node-amqp10/issues/176)
* **codec:** if a function is passed to encode then run it ([ff05c74](https://github.com/noodlefrenzy/node-amqp10/commit/ff05c74))
* **debug-output:** remove debug output for generating timeouts ([ef2c0f4](https://github.com/noodlefrenzy/node-amqp10/commit/ef2c0f4))
* **DefaultPolicy:** limit userPass split to 2 ([2e4b00f](https://github.com/noodlefrenzy/node-amqp10/commit/2e4b00f))
* **deferredAttach:** return reject, or resolve ([64f2e8c](https://github.com/noodlefrenzy/node-amqp10/commit/64f2e8c))
* **deffered-attach:** missed this references during promisification ([e4f6023](https://github.com/noodlefrenzy/node-amqp10/commit/e4f6023))
* **disposition:** only send disposition to relevant links by role ([f93f2a7](https://github.com/noodlefrenzy/node-amqp10/commit/f93f2a7))
* **disposition-test:** pass proper link policy, fix deepMerge ([b782d32](https://github.com/noodlefrenzy/node-amqp10/commit/b782d32))
* **disposition-test:** use this instead of receiver ([9b6a47e](https://github.com/noodlefrenzy/node-amqp10/commit/9b6a47e))
* **disposition-tests:** remove superfluous address in send ([cc51396](https://github.com/noodlefrenzy/node-amqp10/commit/cc51396))
* **DispositionFrame:** use correct channel for disposition frame ([70f9b4c](https://github.com/noodlefrenzy/node-amqp10/commit/70f9b4c))
* **frame-encodings:** remove unused require statements ([37f8ef2](https://github.com/noodlefrenzy/node-amqp10/commit/37f8ef2))
* **int64-coerce:** node 4 doesn't allow us to pass Int64s to Buffer ([347070c](https://github.com/noodlefrenzy/node-amqp10/commit/347070c))
* **link:** promisify detach, properly send closed flag in frame ([158a221](https://github.com/noodlefrenzy/node-amqp10/commit/158a221))
* **Link:** properly call _detached on force detach to cleanup ([79544c4](https://github.com/noodlefrenzy/node-amqp10/commit/79544c4))
* **link-addCredits:** remove listener on resolve for addCredits ([07fdacd](https://github.com/noodlefrenzy/node-amqp10/commit/07fdacd))
* **link-attach:** fix attachment messaging issues due to deps ([f2b6d5e](https://github.com/noodlefrenzy/node-amqp10/commit/f2b6d5e))
* **link-attach:** fix attachment messaging issues due to deps ([38d6d59](https://github.com/noodlefrenzy/node-amqp10/commit/38d6d59))
* **link-attach-test:** properly send back closed in DetachFrame ([151d101](https://github.com/noodlefrenzy/node-amqp10/commit/151d101))
* **link-creation:** remove support for tracking duplicate links ([ad602d2](https://github.com/noodlefrenzy/node-amqp10/commit/ad602d2))
* **link-deatch:** removeListener upon detach ([05f1413](https://github.com/noodlefrenzy/node-amqp10/commit/05f1413))
* **link-debug:** spelling mistake in debug message ([ef6cd17](https://github.com/noodlefrenzy/node-amqp10/commit/ef6cd17))
* **link-options:** changes based on review ([d547ef4](https://github.com/noodlefrenzy/node-amqp10/commit/d547ef4))
* **linting:** add jshint for unused variables, delint codebase ([48a9606](https://github.com/noodlefrenzy/node-amqp10/commit/48a9606))
* **list32:** fix test for decoding list32 types ([96b2b2b](https://github.com/noodlefrenzy/node-amqp10/commit/96b2b2b))
* **message-properties:** add missing field and correct null values ([f8252b1](https://github.com/noodlefrenzy/node-amqp10/commit/f8252b1))
* **message-properties:** added missing amqp symbols for two fields ([d745d85](https://github.com/noodlefrenzy/node-amqp10/commit/d745d85))
* **message-properties:** only access contents if symbol read ([fa77d04](https://github.com/noodlefrenzy/node-amqp10/commit/fa77d04))
* **message-properties:** properly convert symbols from described ([746f439](https://github.com/noodlefrenzy/node-amqp10/commit/746f439))
* **MockClient:** bug in removeAllListeners for node 4.x ([04893e7](https://github.com/noodlefrenzy/node-amqp10/commit/04893e7))
* **MockServer:** handle cases where incomplete data is received ([45ecd2d](https://github.com/noodlefrenzy/node-amqp10/commit/45ecd2d))
* **MockServer:** use proper address, actually send messages ([505bf5e](https://github.com/noodlefrenzy/node-amqp10/commit/505bf5e))
* **multiple-receivers:** register callback when attaching ([1a991b3](https://github.com/noodlefrenzy/node-amqp10/commit/1a991b3))
* **parseLinkAddress:** take policy into account when parsing ([b8fd0f9](https://github.com/noodlefrenzy/node-amqp10/commit/b8fd0f9))
* **reattach:** check for existence of pendingSends before reattach ([a9953e1](https://github.com/noodlefrenzy/node-amqp10/commit/a9953e1))
* **reconnect:** rejection should only happen when no reconnect left ([47e3a98](https://github.com/noodlefrenzy/node-amqp10/commit/47e3a98))
* **SaslInit:** use coerce for mechanisms member ([abb81bd](https://github.com/noodlefrenzy/node-amqp10/commit/abb81bd))
* **SaslInitFrame:** mechanism _must_ be an amqp symbol ([b8c7e84](https://github.com/noodlefrenzy/node-amqp10/commit/b8c7e84))
* **send-object:** allow users to send an object as message body ([b38ace9](https://github.com/noodlefrenzy/node-amqp10/commit/b38ace9))
* **SenderLink:** delete unsettled send on disposition ([5453362](https://github.com/noodlefrenzy/node-amqp10/commit/5453362))
* **SenderLink:** temporarily remove transfersInFlight ([d8738cc](https://github.com/noodlefrenzy/node-amqp10/commit/d8738cc))
* **SenderLink:** update multi-part messages according to comments ([b3d5fb9](https://github.com/noodlefrenzy/node-amqp10/commit/b3d5fb9))
* **SenderLink:** use defaultSubject from policy, added test ([3b676a2](https://github.com/noodlefrenzy/node-amqp10/commit/3b676a2))
* **session:** flow frames with no handle are not errors ([505e803](https://github.com/noodlefrenzy/node-amqp10/commit/505e803))
* **TransferFrame:** accidentally forced type for delivery tag ([91e9fd3](https://github.com/noodlefrenzy/node-amqp10/commit/91e9fd3))
* **travis:** get code climate working again ([976cb25](https://github.com/noodlefrenzy/node-amqp10/commit/976cb25))
* **typo:** attachingListner => attachingListener ([4781f1d](https://github.com/noodlefrenzy/node-amqp10/commit/4781f1d))


### Features

* **ActiveMQ:** add ActiveMQ policy ([5a718a3](https://github.com/noodlefrenzy/node-amqp10/commit/5a718a3))
* **AMQPClient:** provide access to message options on send/receive ([75c4102](https://github.com/noodlefrenzy/node-amqp10/commit/75c4102))
* **auto-settle:** send disposition frames for auto-settle ([1a3473d](https://github.com/noodlefrenzy/node-amqp10/commit/1a3473d))
* **benchmarks:** add basic benchmarks for frameread and codec ([53854f5](https://github.com/noodlefrenzy/node-amqp10/commit/53854f5))
* **benchmarks:** add incredibly simple baseline benchmark tool ([7dbee49](https://github.com/noodlefrenzy/node-amqp10/commit/7dbee49))
* **char:** add basic support for the AMQP char type ([eb212f6](https://github.com/noodlefrenzy/node-amqp10/commit/eb212f6))
* **Client:** remove receipt callback on createReceiver ([88e95b2](https://github.com/noodlefrenzy/node-amqp10/commit/88e95b2))
* **connection-errors:** add some connection-related errors ([f465c3e](https://github.com/noodlefrenzy/node-amqp10/commit/f465c3e))
* **constants:** export Constants to the user ([6c828b7](https://github.com/noodlefrenzy/node-amqp10/commit/6c828b7))
* **createSender:** add createSender to the Client class ([abde6af](https://github.com/noodlefrenzy/node-amqp10/commit/abde6af))
* **default-subject:** allow specifying subjects in link names ([d12313d](https://github.com/noodlefrenzy/node-amqp10/commit/d12313d))
* **deliveryTag:** track delivery tag in Session for shared links ([62a73bd](https://github.com/noodlefrenzy/node-amqp10/commit/62a73bd))
* **disposition:** add accept and reject disposition methods ([423952e](https://github.com/noodlefrenzy/node-amqp10/commit/423952e))
* **disposition-test:** add test for auto-settling messages ([5e42990](https://github.com/noodlefrenzy/node-amqp10/commit/5e42990))
* **errors:** export our errors for user consumption ([cab5120](https://github.com/noodlefrenzy/node-amqp10/commit/cab5120))
* **exports:** open up the possibility of exporting more classes ([6700983](https://github.com/noodlefrenzy/node-amqp10/commit/6700983))
* **failover:** add exponential and fibonacci backoff failover ([6d9dba6](https://github.com/noodlefrenzy/node-amqp10/commit/6d9dba6))
* **generateTimeouts:** add utility for generating timeouts ([47bdd54](https://github.com/noodlefrenzy/node-amqp10/commit/47bdd54))
* **integration-config:** allow override of test server ([1cd72a8](https://github.com/noodlefrenzy/node-amqp10/commit/1cd72a8))
* **link:** add _onAttach deferred attach handler ([f442604](https://github.com/noodlefrenzy/node-amqp10/commit/f442604))
* **Link:** add Link.Attached signal ([21fd06f](https://github.com/noodlefrenzy/node-amqp10/commit/21fd06f))
* **link-addCredits:** make addCredits public and promisified ([4d1899a](https://github.com/noodlefrenzy/node-amqp10/commit/4d1899a))
* **manual-disposition-test:** add test case for manual disposition ([c3d68e1](https://github.com/noodlefrenzy/node-amqp10/commit/c3d68e1))
* **MockServer:** add refactored MockServer ([3652c5c](https://github.com/noodlefrenzy/node-amqp10/commit/3652c5c))
* **object-hash:** add node-object-hash and add utility functions ([a9d616a](https://github.com/noodlefrenzy/node-amqp10/commit/a9d616a))
* **parseLinkAddress:** add utility for parsing a link address ([c50f497](https://github.com/noodlefrenzy/node-amqp10/commit/c50f497))
* **qpid-tests:** add skeleton for qpid integration tests ([a37748a](https://github.com/noodlefrenzy/node-amqp10/commit/a37748a))
* **qpid-tests:** improve Client message options test coverage ([9729b3f](https://github.com/noodlefrenzy/node-amqp10/commit/9729b3f))
* **QpidJavaPolicy:** add policy for qpid java broker ([14c3913](https://github.com/noodlefrenzy/node-amqp10/commit/14c3913))
* **ReceiverLink:** add Received and Modified disposition support ([3bd2500](https://github.com/noodlefrenzy/node-amqp10/commit/3bd2500))
* **SenderLink:** accept a full message as the first param for send ([010aebd](https://github.com/noodlefrenzy/node-amqp10/commit/010aebd))
* **SenderLink:** support splitting messages into multiple frames ([0135c3a](https://github.com/noodlefrenzy/node-amqp10/commit/0135c3a))
* **unique-link-names:** use uniquely generated link names ([1b50b59](https://github.com/noodlefrenzy/node-amqp10/commit/1b50b59))
* **utilities:** add dispositionRange method ([0f5963a](https://github.com/noodlefrenzy/node-amqp10/commit/0f5963a))
* **uuid:** add support for encoding/decoding uuid types ([7363a17](https://github.com/noodlefrenzy/node-amqp10/commit/7363a17))
* **vhosts:** add vhosts specified in address to sasl init frame ([c95b741](https://github.com/noodlefrenzy/node-amqp10/commit/c95b741))


### Performance Improvements

* **tests:** dramatically speed up test runs ([cbdece9](https://github.com/noodlefrenzy/node-amqp10/commit/cbdece9))



