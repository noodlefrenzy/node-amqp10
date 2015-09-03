ifdef GREP
	GREPARG = -g $(GREP)
endif

REPORTER ?= spec
UNIT_TESTS = ./test/unit
QPID_INTEGRATION_TESTS = ./test/integration/qpid
SERVICEBUS_INTEGRATION_TESTS = ./test/integration/servicebus
NPM_BIN = ./node_modules/.bin

jshint:
	$(NPM_BIN)/jshint lib test tools

fixjsstyle:
	fixjsstyle -r lib -r test --strict --jslint_error=all

coverage: jshint
	$(NPM_BIN)/istanbul cover $(NPM_BIN)/_mocha --report lcovonly -- -t 10000 --ui tdd $(UNIT_TESTS) $(QPID_INTEGRATION_TESTS) $(SERVICEBUS_INTEGRATION_TESTS)

codeclimate-send:
	CODECLIMATE_REPO_TOKEN=2612b6d4b7bed06760320154f22eba4e348e53055c0eaf9a9a00e3b05ef3b37d codeclimate < coverage/lcov.info

test-unit: jshint
	$(NPM_BIN)/mocha --globals setImmediate,clearImmediate --check-leaks --colors -t 10000 --reporter $(REPORTER) $(UNIT_TESTS) $(GREPARG)

test-qpid: jshint
	$(NPM_BIN)/mocha --globals setImmediate,clearImmediate --check-leaks --colors -t 10000 --reporter $(REPORTER) $(QPID_INTEGRATION_TESTS) $(GREPARG)

test-servicebus: jshint
	$(NPM_BIN)/mocha --recursive --globals setImmediate,clearImmediate --check-leaks --colors -t 10000 --reporter $(REPORTER) $(SERVICEBUS_INTEGRATION_TESTS) $(GREPARG)

test: test-unit test-qpid test-servicebus

.PHONY: jshint fixjsstyle coverage codeclimate-send test
