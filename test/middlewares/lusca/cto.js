'use strict';

const assert = require('assert');
const request = require('supertest');

const strapi = require('../../..');

const mock = require('./mocks/app');

describe('x-content-type-options', function () {
  it('method', function () {
    assert(typeof strapi.middlewares.lusca.cto === 'function');
  });

  it('assert fail when value not string', function () {
    assert.throws(
      function () {
        strapi.middlewares.lusca.cto();
      },
      /AssertionError/
    );
  });

  it('header (nosniff)', function (done) {
    const router = strapi.middlewares.router();
    const config = {
      cto: 'nosniff'
    };

    const app = mock(config);

    router.get('/', function * () {
      this.body = 'hello';
    });

    app.use(router.routes());
    app.use(router.allowedMethods());

    request(app.listen())
      .get('/')
      .expect('X-Content-Type-Options', config.cto)
      .expect('hello')
      .expect(200, done);
  });
});
