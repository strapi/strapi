'use strict';

const assert = require('assert');
const request = require('supertest');

const strapi = require('../../..');

const mock = require('./mocks/app');

describe('xframe', function () {
  it('method', function () {
    assert(typeof strapi.middlewares.lusca.xframe === 'function');
  });

  it('assert error', function () {
    assert.throws(function () {
      strapi.middlewares.lusca.xframe();
    }, /options\.value should be a string/);
  });

  it('header (deny)', function (done) {
    const config = {
      xframe: 'DENY'
    };

    const app = mock(config);

    request(app.listen())
      .get('/')
      .expect('X-FRAME-OPTIONS', config.xframe)
      .expect(200, done);
  });

  it('header (sameorigin)', function (done) {
    const config = {
      xframe: 'SAMEORIGIN'
    };

    const app = mock(config);

    request(app.listen())
      .get('/')
      .expect('X-FRAME-OPTIONS', config.xframe)
      .expect(200, done);
  });

  it('header (sameorigin) with options.enable true', function (done) {
    const enable = function (url) {
      return url.indexOf('/show') >= 0;
    };

    const router = strapi.middlewares.router();
    const config = {
      xframe: {
        value: 'SAMEORIGIN',
        enable: enable
      }
    };

    const app = mock(config);

    router.get('/show', function* () {
      this.body = 'show';
    });

    app.use(router.routes());
    app.use(router.allowedMethods());

    request(app.listen())
      .get('/show')
      .expect('X-FRAME-OPTIONS', config.xframe.value)
      .expect('show')
      .expect(200, done);
  });

  it('header (sameorigin) with options.enable false', function (done) {
    const enable = function (url) {
      return url.indexOf('/show') >= 0;
    };

    const config = {
      xframe: {
        value: 'SAMEORIGIN',
        enable: enable
      }
    };

    const app = mock(config);

    request(app.listen())
      .get('/')
      .expect(200, function (err, res) {
        assert(!err);
        assert(res.headers['x-frame-options'] === undefined);
        done();
      });
  });
});
