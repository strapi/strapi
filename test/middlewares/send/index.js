'use strict';

const path = require('path');

const request = require('supertest');
const assert = require('assert');

const strapi = require('../../..');
const Koa = strapi.server;

describe('send', function () {
  it('should set the Content-Type', function (done) {
    const app = new Koa();

    app.use(function * () {
      yield strapi.middlewares.send(this, 'test/middlewares/send/fixtures/user.json');
    });

    request(app.listen())
      .get('/')
      .expect('Content-Type', /application\/json/)
      .end(done);
  });

  it('should set the Content-Length', function (done) {
    const app = new Koa();

    app.use(function * () {
      yield strapi.middlewares.send(this, 'test/middlewares/send/fixtures/user.json');
    });

    request(app.listen())
      .get('/')
      .expect('Content-Length', '18')
      .end(done);
  });

  it('should cleanup on socket error', function (done) {
    const app = new Koa();
    let stream;

    app.use(function * () {
      yield strapi.middlewares.send(this, 'test/middlewares/send/fixtures/user.json');
      stream = this.body;
      this.socket.emit('error', new Error('boom'));
    });

    request(app.listen())
      .get('/')
      .expect(500, function (err) {
        err.should.be.ok;
        stream.destroyed.should.be.ok;
        done();
      });
  });

  describe('with no .root', function () {
    describe('when the path is absolute', function () {
      it('should 404', function (done) {
        const app = new Koa();

        app.use(function * () {
          yield strapi.middlewares.send(this, path.resolve(__dirname, 'fixtures', 'hello.txt'));
        });

        request(app.listen())
          .get('/')
          .expect(404, done);
      });
    });

    describe('when the path is relative', function () {
      it('should 200', function (done) {
        const app = new Koa();

        app.use(function * () {
          yield strapi.middlewares.send(this, '/test/middlewares/send/fixtures/hello.txt');
        });

        request(app.listen())
          .get('/')
          .expect(200)
          .expect('world', done);
      });
    });

    describe('when the path contains ..', function () {
      it('should 403', function (done) {
        const app = new Koa();

        app.use(function * () {
          yield strapi.middlewares.send(this, '/../send/fixtures/hello.txt');
        });

        request(app.listen())
          .get('/')
          .expect(403, done);
      });
    });
  });

  describe('with .root', function () {
    describe('when the path is absolute', function () {
      it('should 404', function (done) {
        const app = new Koa();

        app.use(function * () {
          const opts = {
            root: 'test/fixtures'
          };

          yield strapi.middlewares.send(this, path.resolve(__dirname, 'fixtures', 'hello.txt'), opts);
        });

        request(app.listen())
          .get('/')
          .expect(404, done);
      });
    });

    describe('when the path is relative and exists', function () {
      it('should serve the file', function (done) {
        const app = new Koa();

        app.use(function * () {
          const opts = {
            root: 'test/middlewares/send/fixtures'
          };

          yield strapi.middlewares.send(this, 'hello.txt', opts);
        });

        request(app.listen())
          .get('/')
          .expect(200)
          .expect('world', done);
      });
    });

    describe('when the path is relative and does not exist', function () {
      it('should 404', function (done) {
        const app = new Koa();

        app.use(function * () {
          const opts = {
            root: 'test/fixtures'
          };

          yield strapi.middlewares.send(this, 'something', opts);
        });

        request(app.listen())
          .get('/')
          .expect(404, done);
      });
    });

    describe('when the path resolves above the root', function () {
      it('should 403', function (done) {
        const app = new Koa();

        app.use(function * () {
          const opts = {
            root: 'test/fixtures'
          };

          yield strapi.middlewares.send(this, '../../../../package.json', opts);
        });

        request(app.listen())
          .get('/')
          .expect(403, done);
      });
    });

    describe('when the path resolves within root', function () {
      it('should 403', function (done) {
        const app = new Koa();

        app.use(function * () {
          const opts = {
            root: 'test/fixtures'
          };

          yield strapi.middlewares.send(this, '../../../../test/middlewares/send/fixtures/world/index.html', opts);
        });

        request(app.listen())
          .get('/')
          .expect(403, done);
      });
    });
  });

  describe('with .index', function () {
    describe('when the index file is present', function () {
      it('should serve it', function (done) {
        const app = new Koa();

        app.use(function * () {
          const opts = {
            root: 'test/middlewares/send/',
            index: 'index.html'
          };

          yield strapi.middlewares.send(this, 'fixtures/world/', opts);
        });

        request(app.listen())
          .get('/')
          .expect(200)
          .expect('html index', done);
      });

      it('should serve it', function (done) {
        const app = new Koa();

        app.use(function * () {
          const opts = {
            root: 'test/middlewares/send/fixtures/world',
            index: 'index.html'
          };

          yield strapi.middlewares.send(this, this.path, opts);
        });

        request(app.listen())
          .get('/')
          .expect(200)
          .expect('html index', done);
      });
    });
  });

  describe('when path is not a file', function () {
    it('should 404', function (done) {
      const app = new Koa();

      app.use(function * () {
        yield strapi.middlewares.send(this, '/test/middlewares/send/');
      });

      request(app.listen())
        .get('/')
        .expect(404, done);
    });

    it('should return undefined', function (done) {
      const app = new Koa();

      app.use(function * () {
        const sent = yield strapi.middlewares.send(this, '/test/middlewares/send/');
        assert.equal(sent, undefined);
      });

      request(app.listen())
        .get('/')
        .expect(404, done);
    });
  });

  describe('when path is a directory', function () {
    it('should 404', function (done) {
      const app = new Koa();

      app.use(function * () {
        yield strapi.middlewares.send(this, '/test/middlewares/send/fixtures');
      });

      request(app.listen())
      .get('/')
      .expect(404, done);
    });
  });

  describe('when path does not finish with slash and format is disabled', function () {
    it('should 404', function (done) {
      const app = new Koa();

      app.use(function * () {
        const opts = {
          root: 'test',
          index: 'index.html'
        };

        yield strapi.middlewares.send(this, 'middlewares/send/fixtures/world', opts);
      });

      request(app.listen())
        .get('/world')
        .expect(404, done);
    });

    it('should 404', function (done) {
      const app = new Koa();

      app.use(function * () {
        const opts = {
          root: 'test',
          index: 'index.html',
          format: false
        };

        yield strapi.middlewares.send(this, 'middlewares/send/fixtures/world', opts);
      });

      request(app.listen())
        .get('/world')
        .expect(404, done);
    });
  });

  describe('when path does not finish with slash and format is enabled', function () {
    it('should 200', function (done) {
      const app = new Koa();

      app.use(function * () {
        const opts = {
          root: 'test',
          index: 'index.html',
          format: true
        };

        yield strapi.middlewares.send(this, 'middlewares/send/fixtures/world', opts);
      });

      request(app.listen())
        .get('/')
        .expect(200, done);
    });
  });

  describe('when path is malformed', function () {
    it('should 400', function (done) {
      const app = new Koa();

      app.use(function * () {
        yield strapi.middlewares.send(this, '/%');
      });

      request(app.listen())
        .get('/')
        .expect(400, done);
    });
  });

  describe('when path is a file', function () {

    it('should return the path', function (done) {
      const app = new Koa();

      app.use(function * () {
        const p = '/test/middlewares/send/fixtures/user.json';
        const sent = yield strapi.middlewares.send(this, p);
        assert.equal(sent, path.resolve(__dirname, 'fixtures', 'user.json'));
      });

      request(app.listen())
        .get('/')
        .expect(200, done);
    });

    describe('or .gz version when requested and if possible', function () {
      it('should return path', function (done) {
        const app = new Koa();

        app.use(function * () {
          yield strapi.middlewares.send(this, 'test/middlewares/send/fixtures/gzip.json');
        });

        request(app.listen())
          .get('/')
          .set('Accept-Encoding', 'deflate, identity')
          .expect('Content-Length', 18)
          .expect('{ "name": "tobi" }')
          .expect(200, done);
      });

      it('should return .gz path (gzip option defaults to true)', function (done) {
        const app = new Koa();

        app.use(function * () {
          yield strapi.middlewares.send(this, 'test/middlewares/send/fixtures/gzip.json');
        });

        request(app.listen())
          .get('/')
          .set('Accept-Encoding', 'gzip, deflate, identity')
          .expect('Content-Length', 48)
          .expect('{ "name": "tobi" }')
          .expect(200, done);
      });

      it('should return .gz path when gzip option is turned on', function (done) {
        const app = new Koa();

        app.use(function * () {
          yield strapi.middlewares.send(this, 'test/middlewares/send/fixtures/gzip.json', {
            gzip: true
          });
        });

        request(app.listen())
          .get('/')
          .set('Accept-Encoding', 'gzip, deflate, identity')
          .expect('Content-Length', 48)
          .expect('{ "name": "tobi" }')
          .expect(200, done);
      });

      it('should not return .gz path when gzip option is false', function (done) {
        const app = new Koa();

        app.use(function * () {
          yield strapi.middlewares.send(this, 'test/middlewares/send/fixtures/gzip.json', {
            gzip: false
          });
        });

        request(app.listen())
          .get('/')
          .set('Accept-Encoding', 'gzip, deflate, identity')
          .expect('Content-Length', 18)
          .expect('{ "name": "tobi" }')
          .expect(200, done);
      });
    });

    describe('and max age is specified', function () {
      it('should set max-age in seconds', function (done) {
        const app = new Koa();

        app.use(function * () {
          const p = '/test/middlewares/send/fixtures/user.json';
          const sent = yield strapi.middlewares.send(this, p, {
            maxage: 5000
          });

          assert.equal(sent, path.resolve(__dirname, 'fixtures', 'user.json'));
        });

        request(app.listen())
          .get('/')
          .expect('Cache-Control', 'max-age=5')
          .expect(200, done);
      });

      it('should truncate fractional values for max-age', function (done) {
        const app = new Koa();

        app.use(function * () {
          const p = '/test/middlewares/send/fixtures/user.json';
          const sent = yield strapi.middlewares.send(this, p, {
            maxage: 1234
          });

          assert.equal(sent, path.resolve(__dirname, 'fixtures', 'user.json'));
        });

        request(app.listen())
          .get('/')
          .expect('Cache-Control', 'max-age=1')
          .expect(200, done);
      });
    });
  });

  describe('.hidden option', function () {
    describe('when trying to get a hidden file', function () {
      it('should 404', function (done) {
        const app = new Koa();

        app.use(function * () {
          yield strapi.middlewares.send(this, path.resolve(__dirname, 'fixtures', '.hidden'));
        });

        request(app.listen())
          .get('/')
          .expect(404, done);
      });
    });

    describe('when trying to get a file from a hidden directory', function () {
      it('should 404', function (done) {
        const app = new Koa();

        app.use(function * () {
          yield strapi.middlewares.send(this, path.resolve(__dirname, 'fixtures', '.private', 'id_rsa.txt'));
        });

        request(app.listen())
          .get('/')
          .expect(404, done);
      });
    });

    describe('when trying to get a hidden file and .hidden check is turned off', function () {
      it('should 200', function (done) {
        const app = new Koa();

        app.use(function * () {
          yield strapi.middlewares.send(this, 'test/middlewares/send/fixtures/.hidden', {
            hidden: true
          });
        });

        request(app.listen())
          .get('/')
          .expect(200, done);
      });
    });
  });
});
