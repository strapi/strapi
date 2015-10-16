'use strict';

const path = require('path');

const request = require('supertest');

const strapi = require('../../..');
const Koa = strapi.server;

describe('i18n', function () {
  describe('detect the query string', function () {
    it('should be "en" locale', function (done) {
      const app = new Koa();

      strapi.middlewares.locale(app);

      app.use(strapi.middlewares.i18n(app, {
        directory: path.resolve(__dirname, 'fixtures'),
        locales: ['zh-CN', 'en'],
        modes: ['query']
      }));

      app.use(function * () {
        this.body = this.i18n.__('locales.en');
      });

      request(app.listen())
        .get('/?locale=en')
        .expect(/english/i)
        .expect(200, done);
    });
  });

  describe('detect the subdomain', function () {
    const app = new Koa();

    strapi.middlewares.locale(app);

    let enApp = strapi.server();
    enApp.use(function * () {
      this.body = this.getLocaleFromSubdomain();
    });

    enApp = strapi.middlewares.compose(enApp);

    let zhCNApp = strapi.server();
    zhCNApp.use(function * () {
      this.body = this.getLocaleFromSubdomain();
    });

    zhCNApp = strapi.middlewares.compose(zhCNApp);

    app.use(function * (next) {
      switch (this.host) {
        case 'en.koajs.com':
          return yield enApp.call(this, next);
        case 'zh-CN.koajs.com':
          return yield zhCNApp.call(this, next);
      }

      yield next;
    });

    app.use(strapi.middlewares.i18n(app, {
      directory: path.resolve(__dirname, 'fixtures'),
      locales: ['zh-CN', 'en', 'zh-tw'],
      modes: ['subdomain']
    }));

    app.use(function * () {
      this.body = this.i18n.__('locales.en');
    });

    it('should be "en" locale', function (done) {
      request(app.listen())
        .get('/')
        .set('Host', 'eN.koajs.com')
        .expect(/English/)
        .expect(200, done);
    });

    it('should be "zh-cn" locale', function (done) {
      request(app.listen())
        .get('/')
        .set('Host', 'zh-CN.koajs.com')
        .expect(/英文/)
        .expect(200, done);
    });

    it('should be "zh-tw" locale', function (done) {
      request(app.listen())
        .get('/')
        .set('Host', 'zh-TW.koajs.com')
        .expect(/locales.en/)
        .expect(200, done);
    });
  });

  describe('detect the header', function () {
    it('should be "zh-tw" locale', function (done) {
      const app = new Koa();

      strapi.middlewares.locale(app);

      app.use(strapi.middlewares.i18n(app, {
        directory: path.resolve(__dirname, 'fixtures'),
        locales: ['zh-CN', 'en', 'zh-tw'],
        modes: ['header']
      }));

      app.use(function * () {
        this.body = this.i18n.__('locales.zh-CN');
      });

      request(app.listen())
        .get('/')
        .set('Accept-Language', 'zh-TW')
        .expect(/簡體中文/)
        .expect(200, done);
    });
  });

  describe('detect the cookie', function () {
    it('should be "zh-cn" locale', function (done) {
      const app = new Koa();

      strapi.middlewares.locale(app);

      app.use(strapi.middlewares.i18n(app, {
        directory: path.resolve(__dirname, 'fixtures'),
        locales: ['zh-CN', 'en', 'zh-tw'],
        modes: ['cookie']
      }));

      app.use(function * () {
        this.body = this.i18n.__('locales.zh-CN');
      });

      request(app.listen())
        .get('/')
        .set('Cookie', 'locale=zh-cn')
        .expect(/简体中文/)
        .expect(200, done);
    });
  });

  describe('detect the header and cookie', function () {
    let app;

    beforeEach(function () {
      app = strapi.server();

      strapi.middlewares.locale(app);

      app.use(strapi.middlewares.i18n(app, {
        directory: path.resolve(__dirname, 'fixtures'),
        locales: ['zh-CN', 'en', 'zh-tw'],
        modes: ['cookie', 'header']
      }));

      app.use(function * () {
        this.body = this.i18n.__('locales.zh-CN');
      });
    });

    it('should be "zh-tw" locale', function (done) {
      request(app.listen())
        .get('/')
        .set('Accept-Language', 'zh-TW')
        .expect(/簡體中文/)
        .expect(200, done);
    });

    it('should be "zh-cn" locale', function (done) {
      request(app.listen())
        .get('/')
        .set('Cookie', 'locale=zh-cn')
        .set('Accept-Language', 'en')
        .expect(/简体中文/)
        .expect(200, done);
    });
  });
});
