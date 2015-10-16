'use strict';

const assert = require('assert');
const request = require('supertest');

const strapi = require('../../..');

const mock = require('./mocks/app');

describe('p3p', function () {
  it('method', function () {
    assert(typeof strapi.middlewares.lusca.p3p === 'function');
  });

  it('assert error when p3p value is not a string', function () {
    assert.throws(function () {
      strapi.middlewares.lusca.p3p();
    }, /options\.value should be a string/);

    assert.throws(function () {
      strapi.middlewares.lusca.p3p(123);
    }, /options\.value should be a string/);

    assert.throws(function () {
      strapi.middlewares.lusca.p3p({});
    }, /options\.value should be a string/);
  });

  it('header', function (done) {
    const router = strapi.middlewares.router();
    const config = {
      p3p: 'MY_P3P_VALUE'
    };

    const app = mock(config);

    router.get('/', function * () {
      this.body = 'hello';
    });

    app.use(router.routes());
    app.use(router.allowedMethods());

    request(app.listen())
      .get('/')
      .expect('P3P', config.p3p)
      .expect('hello')
      .expect(200, done);
  });
});
