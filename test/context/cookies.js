'use strict';

const request = require('supertest');

const strapi = require('../..');

describe('ctx.cookies.set()', function () {
  it('should set an unsigned cookie', function (done) {
    const app = strapi.server();

    app.use(function * () {
      this.cookies.set('name', 'jon');
      this.status = 204;
    });

    request(app.listen())
      .get('/')
      .expect(204)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        res.headers['set-cookie'].some(function (cookie) {
          return /^name=/.test(cookie);
        }).should.be.ok;

        done();
      });
  });

  describe('with .signed', function () {
    describe('when no .keys are set', function () {
      it('should error', function (done) {
        const app = strapi.server();

        app.use(function * () {
          try {
            this.cookies.set('foo', 'bar', {
              signed: true
            });
          } catch (err) {
            this.body = err.message;
          }
        });

        request(app.listen())
          .get('/')
          .expect('.keys required for signed cookies', done);
      });
    });

    it('should send a signed cookie', function (done) {
      const app = strapi.server();

      app.keys = ['a', 'b'];

      app.use(function * () {
        this.cookies.set('name', 'jon', {
          signed: true
        });
        this.status = 204;
      });

      request(app.listen())
        .get('/')
        .expect(204)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }

          const cookies = res.headers['set-cookie'];

          cookies.some(function (cookie) {
            return /^name=/.test(cookie);
          }).should.be.ok;

          cookies.some(function (cookie) {
            return /^name\.sig=/.test(cookie);
          }).should.be.ok;

          done();
        });
    });
  });
});
