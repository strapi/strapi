'use strict';

const assert = require('assert');
const request = require('supertest');

const strapi = require('../../..');

const mock = require('./mocks/app');

describe('hsts', function () {
  it('method', function () {
    assert(typeof strapi.middlewares.lusca.hsts === 'function');
  });

  it('assert error when maxAge is not number', function () {
    assert.throws(function () {
      strapi.middlewares.lusca.hsts();
    }, /options\.maxAge should be a number/);
  });

  it('header (maxAge)', function (done) {
    const router = strapi.middlewares.router();
    const config = {
      hsts: {
        maxAge: 31536000
      }
    };

    const app = mock(config);

    app.use(router.routes());
    app.use(router.allowedMethods());

    router.get('/', function* () {
      this.body = 'hello';
    });

    request(app.listen())
      .get('/')
      .expect('Strict-Transport-Security', 'max-age=' + config.hsts.maxAge)
      .expect('hello')
      .expect(200, done);
  });

  it('header (maxAge 0)', function (done) {
    const router = strapi.middlewares.router();
    const config = {
      hsts: {
        maxAge: 0
      }
    };

    const app = mock(config);

    app.use(router.routes());
    app.use(router.allowedMethods());

    router.get('/', function* () {
      this.body = 'hello';
    });

    request(app.listen())
      .get('/')
      .expect('Strict-Transport-Security', 'max-age=0')
      .expect('hello')
      .expect(200, done);
  });

  it('hsts = number', function (done) {
    const router = strapi.middlewares.router();
    const config = {
      hsts: 31536000
    };

    const app = mock(config);

    app.use(router.routes());
    app.use(router.allowedMethods());

    router.get('/', function* () {
      this.body = 'hello';
    });

    request(app.listen())
      .get('/')
      .expect('Strict-Transport-Security', 'max-age=31536000')
      .expect('hello')
      .expect(200, done);
  });

  it('header (maxAge; includeSubDomains)', function (done) {
    const router = strapi.middlewares.router();
    const config = {
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true
      }
    };

    const app = mock(config);

    app.use(router.routes());
    app.use(router.allowedMethods());

    router.get('/', function* () {
      this.body = 'hello';
    });

    request(app.listen())
      .get('/')
      .expect('Strict-Transport-Security', 'max-age=' + config.hsts.maxAge + '; includeSubDomains')
      .expect('hello')
      .expect(200, done);
  });

  it('header (maxAge; includeSubDomains; preload)', function (done) {
    const router = strapi.middlewares.router();
    const config = {
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    };

    const app = mock(config);

    app.use(router.routes());
    app.use(router.allowedMethods());

    router.get('/', function* () {
      this.body = 'hello';
    });

    request(app.listen())
      .get('/')
      .expect('Strict-Transport-Security', 'max-age=' + config.hsts.maxAge + '; includeSubDomains; preload')
      .expect('hello')
      .expect(200, done);
  });

  it('header (missing maxAge)', function () {
    assert.throws(function () {
      mock({
        hsts: {}
      });
    }, /options\.maxAge should be a number/);
  });
});
