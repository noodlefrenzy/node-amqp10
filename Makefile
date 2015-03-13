REPORTER ?= spec
TESTS = $(shell find ./test/* -name "test_*.js")

jshint:
	./node_modules/.bin/jshint lib test

fixjsstyle:
	fixjsstyle -r lib --strict --jslint_error=all

coverage:
	./node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha --report lcovonly -- -t 10000 --ui tdd $(TESTS); \

codeclimate-send:
	CODECLIMATE_REPO_TOKEN=b33b8273d40cd973eaa72e274445544847dc4ed74447118765176eae6dd722cb codeclimate < coverage/lcov.info

test:
	@if [ "$$GREP" ]; then \
		./node_modules/mocha/bin/mocha --globals setImmediate,clearImmediate --check-leaks --colors -t 10000 --reporter $(REPORTER) -g "$$GREP" $(TESTS); \
	else \
		./node_modules/mocha/bin/mocha --globals setImmediate,clearImmediate --check-leaks --colors -t 10000 --reporter $(REPORTER) $(TESTS); \
	fi

.PHONY: test jshint fixjsstyle coverage
