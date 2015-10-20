'use strict';

const path = require('path');

const request = require('supertest');

const strapi = require('../../..');
const Koa = strapi.server;

describe('views', function () {
  it('have a render method', function (done) {
    const app = new Koa();

    app.use(strapi.middlewares.views());

    app.use(function * () {
      this.render.should.ok;
      this.render.should.Function;
    });

    request(app.listen())
      .get('/')
      .expect(404, done);
  });

  it('default to html', function (done) {
    const app = new Koa();
    const router = strapi.middlewares.router();

    app.use(strapi.middlewares.views(path.resolve(__dirname, 'fixtures')));

    router.get('/', function * () {
      yield this.render('basic');
    });

    app.use(router.routes());
    app.use(router.allowedMethods());

    request(app.listen())
      .get('/')
      .expect('Content-Type', /html/)
      .expect(/basic:html/)
      .expect(200, done);
  });

  it('default to ext if a default engine is set', function (done) {
    const app = new Koa();

    app.use(strapi.middlewares.views(path.resolve(__dirname, 'fixtures'), {
      default: 'jade'
    }));

    app.use(function * () {
      yield this.render('basic');
    });

    request(app.listen())
      .get('/')
      .expect('Content-Type', /html/)
      .expect(/basic:jade/)
      .expect(200, done);
  });

  it('set and render state', function (done) {
    const app = new Koa();

    app.use(strapi.middlewares.views(path.resolve(__dirname, 'fixtures'), {
      default: 'jade'
    }));

    app.use(function * () {
      this.state.engine = 'jade';
      yield this.render('global-state');
    });

    request(app.listen())
      .get('/')
      .expect('Content-Type', /html/)
      .expect(/basic:jade/)
      .expect(200, done);
  });

  it('set option: root', function (done) {
    const app = new Koa();

    app.use(strapi.middlewares.views(path.resolve(__dirname, 'fixtures'), {
      root: '../../../test',
      default: 'jade'
    }));

    app.use(function * () {
      this.state.engine = 'jade';
      yield this.render('global-state');
    });

    request(app.listen())
      .get('/')
      .expect('Content-Type', /html/)
      .expect(/basic:jade/)
      .expect(200, done);
  });

  it('works with circular references in state', function (done) {
    const app = new Koa();

    app.use(strapi.middlewares.views(path.resolve(__dirname, 'fixtures'), {
      default: 'jade'
    }));

    app.use(function * () {
      this.state = {
        a: {},
        app: app
      };

      this.state.a.a = this.state.a;

      yield this.render('global-state', {
        app: app,
        b: this.state,
        engine: 'jade'
      });
    });

    request(app.listen())
      .get('/')
      .expect('Content-Type', /html/)
      .expect(/basic:jade/)
      .expect(200, done);
  });

  it('map given engine to given file ext', function (done) {
    const app = new Koa();

    app.use(strapi.middlewares.views(path.resolve(__dirname, 'fixtures'), {
      map: {
        html: 'lodash'
      }
    }));

    app.use(function * () {
      this.state.engine = 'lodash';
      yield this.render('lodash');
    });

    request(app.listen())
      .get('/')
      .expect('Content-Type', /html/)
      .expect(/basic:lodash/)
      .expect(200, done);
  });

  it('merges global and local state ', function (done) {
    const app = new Koa();

    app.use(strapi.middlewares.views(path.resolve(__dirname, 'fixtures'), {
      default: 'jade'
    }));

    app.use(function * () {
      this.state.engine = 'jade';

      yield this.render('state', {
        type: 'basic'
      });
    });

    request(app.listen())
      .get('/')
      .expect('Content-Type', /html/)
      .expect(/basic:jade/)
      .expect(200, done);
  });

  it('yields to the next middleware if this.render is already defined', function (done) {
    const app = new Koa();

    app.use(function * (next) {
      this.render = true;
      yield next;
    });

    app.use(strapi.middlewares.views());

    app.use(function * () {
      this.body = 'hello';
    });

    request(app.listen())
      .get('/')
      .expect('hello')
      .expect(200, done);
  });
});
