MAKEFLAGS = -j1

export NODE_ENV = test

.PHONY: test

lint:
	./node_modules/.bin/eslint **/*.js

test: lint
	./scripts/test.sh

docs:
	mkdocs build --clean

setup:
	./scripts/setup.sh
