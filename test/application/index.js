'use strict';

const assert = require('assert');
const request = require('supertest');

const Koa = require('../..').server;

describe('app', function () {
  it('should handle socket errors', function (done) {
    const app = new Koa();

    app.use(function * () {
      this.socket.emit('error', new Error('boom'));
    });

    app.on('error', function (err) {
      err.message.should.equal('boom');
      done();
    });

    request(app.listen())
      .get('/')
      .end(function () {});
  });

  it('should not .writeHead when !socket.writable', function (done) {
    const app = new Koa();

    app.use(function * () {
      this.socket.writable = false;
      this.status = 204;
      this.res.writeHead =
      this.res.end = function () {
        throw new Error('response sent');
      };
    });

    setImmediate(done);

    request(app.listen())
      .get('/')
      .end(function () {});
  });

  it('should set development env when NODE_ENV missing', function () {
    const NODE_ENV = process.env.NODE_ENV;
    process.env.NODE_ENV = '';

    const app = new Koa();
    process.env.NODE_ENV = NODE_ENV;

    assert.equal(app.env, 'development');
  });
});
