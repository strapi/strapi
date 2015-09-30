'use strict';

const request = require('supertest');

const strapi = require('../..');

describe('ctx.onerror(err)', function () {
  it('should respond', function (done) {
    const app = strapi.server();

    app.use(function * () {
      this.body = 'something else';

      this.throw(418, 'boom');
    });

    request(app.listen())
      .get('/')
      .expect(418)
      .expect('Content-Type', 'text/plain; charset=utf-8')
      .expect('Content-Length', '4')
      .end(done);
  });

  it('should unset all headers', function (done) {
    const app = strapi.server();

    app.use(function * () {
      this.set('Vary', 'Accept-Encoding');
      this.set('X-CSRF-Token', 'asdf');
      this.body = 'response';

      this.throw(418, 'boom');
    });

    request(app.listen())
      .get('/')
      .expect(418)
      .expect('Content-Type', 'text/plain; charset=utf-8')
      .expect('Content-Length', '4')
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        res.headers.should.not.have.property('vary');
        res.headers.should.not.have.property('x-csrf-token');

        done();
      });
  });

  describe('when invalid err.status', function () {
    describe('not number', function () {
      it('should respond 500', function (done) {
        const app = strapi.server();

        app.use(function * () {
          this.body = 'something else';
          const err = new Error('some error');
          err.status = 'notnumber';
          throw err;
        });

        request(app.listen())
          .get('/')
          .expect(500)
          .expect('Content-Type', 'text/plain; charset=utf-8')
          .expect('Internal Server Error', done);
      });
    });

    describe('not http status code', function () {
      it('should respond 500', function (done) {
        const app = strapi.server();

        app.use(function * () {
          this.body = 'something else';
          const err = new Error('some error');
          err.status = 9999;
          throw err;
        });

        request(app.listen())
          .get('/')
          .expect(500)
          .expect('Content-Type', 'text/plain; charset=utf-8')
          .expect('Internal Server Error', done);
      });
    });
  });

  describe('when non-error thrown', function () {
    it('should response non-error thrown message', function (done) {
      const app = strapi.server();

      app.use(function * () {
        throw 'string error';
      });

      request(app.listen())
        .get('/')
        .expect(500)
        .expect('Content-Type', 'text/plain; charset=utf-8')
        .expect('Internal Server Error', done);
    });
  });
});
