SRC = lib/*.js

include node_modules/make-lint/index.mk

BIN = node

REQUIRED = --require should --require should-http

TESTS = test/application/* \
	test/context/* \
	test/request/* \
	test/response/* \
	test/middlewares/*

test:
	@NODE_ENV=test $(BIN) \
		./node_modules/.bin/_mocha \
		$(REQUIRED) \
		$(TESTS) \
		--bail

test-travis:
	@NODE_ENV=test $(BIN) \
		./node_modules/.bin/istanbul cover \
		./node_modules/.bin/_mocha \
		--report lcovonly \
		-- -u exports \
		$(REQUIRED) \
		$(TESTS) \
		--bail

bench:
	@$(MAKE) -C benchmarks

.PHONY: test bench
