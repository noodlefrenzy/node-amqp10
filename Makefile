REPORTER ?= spec
UNIT_TESTS = $(shell find ./test/unit -name "test_*.js")
NPM_BIN = ./node_modules/.bin

jshint:
	$(NPM_BIN)/jshint lib test tools

fixjsstyle:
	fixjsstyle -r lib -r test --strict --jslint_error=all

coverage:
	make jshint && $(NPM_BIN)/istanbul cover $(NPM_BIN)/_mocha --report lcovonly -- -t 10000 --ui tdd $(TESTS); \

codeclimate-send:
	CODECLIMATE_REPO_TOKEN=2612b6d4b7bed06760320154f22eba4e348e53055c0eaf9a9a00e3b05ef3b37d codeclimate < coverage/lcov.info

test-unit:
	@if [ "$$GREP" ]; then \
		make jshint && $(NPM_BIN)/mocha --globals setImmediate,clearImmediate --check-leaks --colors -t 10000 --reporter $(REPORTER) -g "$$GREP" $(UNIT_TESTS); \
	else \
		make jshint && $(NPM_BIN)/mocha --globals setImmediate,clearImmediate --check-leaks --colors -t 10000 --reporter $(REPORTER) $(UNIT_TESTS); \
	fi

test: test-unit

.PHONY: jshint fixjsstyle coverage codeclimate-send test
