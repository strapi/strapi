MAKEFLAGS = -j1

export NODE_ENV = test

.PHONY: test

lint:
	./node_modules/.bin/xo

test: lint
	./scripts/test.sh

docs:
	mkdocs build --clean
