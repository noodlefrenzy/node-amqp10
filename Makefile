ifdef GREP
	GREPARG = -g $(GREP)
endif

REPORTER ?= spec
UNIT_TESTS = ./test/unit
QPID_INTEGRATION_TESTS = ./test/integration/qpid
SERVICEBUS_INTEGRATION_TESTS = ./test/integration/servicebus
NPM_BIN = ./node_modules/.bin
TIMEOUT = 30000

jshint:
	$(NPM_BIN)/jshint lib test tools examples

fixjsstyle:
	fixjsstyle -r lib -r test --strict --jslint_error=all

coverage: jshint
	$(NPM_BIN)/istanbul cover $(NPM_BIN)/_mocha --report lcovonly -- --recursive -t $(TIMEOUT) --ui tdd $(UNIT_TESTS) $(QPID_INTEGRATION_TESTS) $(SERVICEBUS_INTEGRATION_TESTS)

test-unit: jshint
	$(NPM_BIN)/mocha --globals setImmediate,clearImmediate --recursive --check-leaks --colors -t $(TIMEOUT) --reporter $(REPORTER) $(UNIT_TESTS) $(GREPARG)

test-qpid: jshint
	$(NPM_BIN)/mocha --globals setImmediate,clearImmediate --recursive --check-leaks --colors -t $(TIMEOUT) --reporter $(REPORTER) $(QPID_INTEGRATION_TESTS) $(GREPARG)

test-servicebus: jshint
	$(NPM_BIN)/mocha --recursive --globals setImmediate,clearImmediate --recursive --check-leaks --colors -t $(TIMEOUT) --reporter $(REPORTER) $(SERVICEBUS_INTEGRATION_TESTS) $(GREPARG)

test: test-unit test-qpid test-servicebus

changelog:
	${NPM_BIN}/conventional-changelog -p angular -i CHANGELOG.md -s

apidoc: jshint
	$(NPM_BIN)/jsdoc2md --src lib/**/*.js > api/README.md

.PHONY: jshint fixjsstyle coverage test changelog apidoc
