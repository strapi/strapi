'use strict';

const AssertionError = require('assert').AssertionError;
const stderr = require('test-console').stderr;

const Koa = require('../..').server;

describe('app.onerror(err)', function () {
  it('should throw an error if a non-error is given', function (done) {
    const app = new Koa();

    (function () {
      app.onerror('foo');
    }).should.throw(AssertionError, {
      message: 'non-error thrown: foo'
    });

    done();
  });

  it('should do nothing if status is 404', function (done) {
    const app = new Koa();
    const err = new Error();

    err.status = 404;

    const output = stderr.inspectSync(function () {
      app.onerror(err);
    });

    output.should.eql([]);

    done();
  });

  it('should do nothing if .silent', function (done) {
    const app = new Koa();
    app.silent = true;

    const err = new Error();

    const output = stderr.inspectSync(function () {
      app.onerror(err);
    });

    output.should.eql([]);

    done();
  });

  it('should log the error to stderr', function (done) {
    const app = new Koa();
    app.env = 'dev';

    const err = new Error();
    err.stack = 'Foo';

    const output = stderr.inspectSync(function () {
      app.onerror(err);
    });

    output.should.eql(['\n', '  Foo\n', '\n']);

    done();
  });

  it('should use err.toString() instad of err.stack', function (done) {
    const app = new Koa();
    app.env = 'dev';

    const err = new Error('mock stack null');
    err.stack = null;

    const output = stderr.inspectSync(function () {
      app.onerror(err);
    });

    output.should.eql(['\n', '  Error: mock stack null\n', '\n']);

    done();
  });
});
