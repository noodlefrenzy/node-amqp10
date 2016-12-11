ifdef GREP
	GREPARG = -g $(GREP)
endif

REPORTER ?= spec
UNIT_TESTS = ./test/unit
QPID_INTEGRATION_TESTS = ./test/integration/qpid
SERVICEBUS_INTEGRATION_TESTS = ./test/integration/servicebus
NPM_BIN = ./node_modules/.bin
TIMEOUT = 30000
PUBLIC_API_SRC = lib/amqp_client.js lib/link.js lib/receiver_link.js lib/sender_link.js lib/policies/policy.js

jshint:
	$(NPM_BIN)/jshint lib test tools examples

fixjsstyle:
	fixjsstyle -r lib -r test --strict --jslint_error=all

coverage: jshint
	$(NPM_BIN)/istanbul cover $(NPM_BIN)/_mocha -- --recursive -t $(TIMEOUT) --ui tdd $(UNIT_TESTS) $(QPID_INTEGRATION_TESTS) $(SERVICEBUS_INTEGRATION_TESTS)

test-unit: jshint
	$(NPM_BIN)/mocha --recursive --check-leaks --colors -t $(TIMEOUT) --reporter $(REPORTER) $(UNIT_TESTS) $(GREPARG)

test-qpid: jshint
	$(NPM_BIN)/mocha --recursive --check-leaks --colors -t $(TIMEOUT) --reporter $(REPORTER) $(QPID_INTEGRATION_TESTS) $(GREPARG)

test-servicebus: jshint
	$(NPM_BIN)/mocha --recursive --check-leaks --colors -t $(TIMEOUT) --reporter $(REPORTER) $(SERVICEBUS_INTEGRATION_TESTS) $(GREPARG)

test: test-unit test-qpid test-servicebus

changelog:
	${NPM_BIN}/conventional-changelog -p angular -i CHANGELOG.md -s

gen-docs: jshint
	$(NPM_BIN)/jsdoc -c jsdoc.json -R README.md

docs: gen-docs
	$(NPM_BIN)/gh-pages -d docs

.PHONY: jshint fixjsstyle coverage test changelog apidoc
