'use strict';

const request = require('supertest');
const assert = require('assert');

const strapi = require('../../..');

const mock = require('./mocks/app');

describe('xssProtection', function () {
  it('method', function () {
    assert(typeof strapi.middlewares.lusca.xssProtection === 'function');
  });

  it('xssProtection = 1', function (done) {
    const config = {
      xssProtection: 1
    };

    const app = mock(config);

    request(app.listen())
      .get('/')
      .expect('X-XSS-Protection', '1; mode=block')
      .expect(200, done);
  });

  it('header (enabled)', function (done) {
    const config = {
      xssProtection: true
    };

    const app = mock(config);

    request(app.listen())
      .get('/')
      .expect('X-XSS-Protection', '1; mode=block')
      .expect(200, done);
  });

  it('header (enabled; custom mode)', function (done) {
    const config = {
      xssProtection: {
        enabled: 1,
        mode: 'foo'
      }
    };

    const app = mock(config);

    request(app.listen())
      .get('/')
      .expect('X-XSS-Protection', '1; mode=foo')
      .expect(200, done);
  });

  it('header (enabled is boolean; custom mode)', function (done) {
    const config = {
      xssProtection: {
        enabled: true
      }
    };

    const app = mock(config);

    request(app.listen())
      .get('/')
      .expect('X-XSS-Protection', '1; mode=block')
      .expect(200, done);
  });

  it('header (!enabled)', function (done) {
    const config = {
      xssProtection: {
        enabled: 0
      }
    };

    const app = mock(config);

    request(app.listen())
      .get('/')
      .expect('X-XSS-Protection', '0; mode=block')
      .expect(200, done);
  });
});
