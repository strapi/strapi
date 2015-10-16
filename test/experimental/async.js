'use strict';

const request = require('supertest');

const Koa = require('../..').server;

describe('.experimental=true', function () {
  it('should support async functions', function (done) {
    const app = new Koa();
    app.experimental = true;
    app.use(async function () {
      const string = await Promise.resolve('asdf');
      this.body = string;
    });

    request(app.callback())
      .get('/')
      .expect('asdf')
      .expect(200, done);
  });
});
