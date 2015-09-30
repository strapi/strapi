'use strict';

const path = require('path');

const request = require('supertest');

const strapi = require('../../..');

describe('assets', function () {
  describe('when defer: false', function () {
    describe('when root = "."', function () {
      it('should serve from cwd', function (done) {
        const app = strapi.server();

        app.use(strapi.middlewares.static('.'));

        request(app.listen())
          .get('/package.json')
          .expect(200, done);
      });
    });

    describe('when path is not a file', function () {
      it('should 404', function (done) {
        const app = strapi.server();

        app.use(strapi.middlewares.static(path.resolve(__dirname, 'fixtures')));

        request(app.listen())
          .get('/something')
          .expect(404, done);
      });
    });

    describe('when upstream middleware responds', function () {
      it('should respond', function (done) {
        const app = strapi.server();

        app.use(strapi.middlewares.static(path.resolve(__dirname, 'fixtures')));

        app.use(function * (next) {
          yield next;
          this.body = 'hey';
        });

        request(app.listen())
          .get('/hello.txt')
          .expect(200)
          .expect('world', done);
      });
    });

    describe('the path is valid', function () {
      it('should serve the file', function (done) {
        const app = strapi.server();

        app.use(strapi.middlewares.static(path.resolve(__dirname, 'fixtures')));

        request(app.listen())
          .get('/hello.txt')
          .expect(200)
          .expect('world', done);
      });
    });

    describe('.index', function () {
      describe('when present', function () {
        it('should alter the index file supported', function (done) {
          const app = strapi.server();

          app.use(strapi.middlewares.static(path.resolve(__dirname, 'fixtures'), {
            index: 'index.txt'
          }));

          request(app.listen())
            .get('/')
            .expect(200)
            .expect('Content-Type', 'text/plain; charset=utf-8')
            .expect('text index', done);
        });
      });

      describe('when omitted', function () {
        it('should use index.html', function (done) {
          const app = strapi.server();

          app.use(strapi.middlewares.static(path.resolve(__dirname, 'fixtures')));

          request(app.listen())
            .get('/world/')
            .expect(200)
            .expect('Content-Type', 'text/html; charset=utf-8')
            .expect('html index', done);
        });
      });
    });

    describe('when method is not `GET` or `HEAD`', function () {
      it('should 404', function (done) {
        const app = strapi.server();

        app.use(strapi.middlewares.static(path.resolve(__dirname, 'fixtures')));

        request(app.listen())
          .post('/hello.txt')
          .expect(404, done);
      });
    });
  });

  describe('when defer: true', function () {
    describe('when upstream middleware responds', function () {
      it('should do nothing', function (done) {
        const app = strapi.server();

        app.use(strapi.middlewares.static(path.resolve(__dirname, 'fixtures'), {
          defer: true
        }));

        app.use(function * (next) {
          yield next;
          this.body = 'hey';
        });

        request(app.listen())
          .get('/hello.txt')
          .expect(200)
          .expect('hey', done);
      });
    });

    describe('the path is valid', function () {
      it('should serve the file', function (done) {
        const app = strapi.server();

        app.use(strapi.middlewares.static(path.resolve(__dirname, 'fixtures'), {
          defer: true
        }));

        request(app.listen())
          .get('/hello.txt')
          .expect(200)
          .expect('world', done);
      });
    });

    describe('.index', function () {
      describe('when present', function () {
        it('should alter the index file supported', function (done) {
          const app = strapi.server();

          app.use(strapi.middlewares.static(path.resolve(__dirname, 'fixtures'), {
            defer: true,
            index: 'index.txt'
          }));

          request(app.listen())
            .get('/')
            .expect(200)
            .expect('Content-Type', 'text/plain; charset=utf-8')
            .expect('text index', done);
        });
      });

      describe('when omitted', function () {
        it('should use index.html', function (done) {
          const app = strapi.server();

          app.use(strapi.middlewares.static(path.resolve(__dirname, 'fixtures'), {
            defer: true
          }));

          request(app.listen())
            .get('/world/')
            .expect(200)
            .expect('Content-Type', 'text/html; charset=utf-8')
            .expect('html index', done);
        });
      });
    });

    describe('when path is not a file', function () {
      it('should 404', function (done) {
        const app = strapi.server();

        app.use(strapi.middlewares.static(path.resolve(__dirname, 'fixtures'), {
          defer: true
        }));

        request(app.listen())
          .get('/something')
          .expect(404, done);
      });
    });

    describe('it should not handle the request', function () {
      it('when status=204', function (done) {
        const app = strapi.server();

        app.use(strapi.middlewares.static(path.resolve(__dirname, 'fixtures'), {
          defer: true
        }));

        app.use(function * () {
          this.status = 204;
        });

        request(app.listen())
          .get('/something%%%/')
          .expect(204, done);
      });

      it('when body=""', function (done) {
        const app = strapi.server();

        app.use(strapi.middlewares.static(path.resolve(__dirname, 'fixtures'), {
          defer: true
        }));

        app.use(function * () {
          this.body = '';
        });

        request(app.listen())
          .get('/something%%%/')
          .expect(200, done);
      });
    });

    describe('when method is not `GET` or `HEAD`', function () {
      it('should 404', function (done) {
        const app = strapi.server();

        app.use(strapi.middlewares.static(path.resolve(__dirname, 'fixtures'), {
          defer: true
        }));

        request(app.listen())
          .post('/hello.txt')
          .expect(404, done);
      });
    });
  });
});
