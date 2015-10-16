'use strict';

const assert = require('assert');
const request = require('supertest');
const statuses = require('statuses');

const response = require('../helpers/context').response;

const Koa = require('../..').server;

describe('res.status=', function () {
  describe('when a status code', function () {
    describe('and valid', function () {
      it('should set the status', function () {
        const res = response();
        res.status = 403;
        res.status.should.equal(403);
      });

      it('should not throw', function () {
        assert.doesNotThrow(function () {
          response().status = 403;
        });
      });
    });

    describe('and invalid', function () {
      it('should throw', function () {
        assert.throws(function () {
          response().status = 999;
        }, 'invalid status code: 999');
      });
    });

    describe('and custom status', function () {
      before(function () {
        statuses['700'] = 'custom status';
      });

      it('should set the status', function () {
        const res = response();
        res.status = 700;
        res.status.should.equal(700);
      });

      it('should not throw', function () {
        assert.doesNotThrow(function () {
          response().status = 700;
        });
      });
    });
  });

  describe('when a status string', function () {
    it('should throw', function () {
      assert.throws(function () {
        response().status = 'forbidden';
      }, 'status code must be a number');
    });
  });

  function strip (status) {
    it('should strip content related header fields', function (done) {
      const app = new Koa();

      app.use(function * () {
        this.body = {
          foo: 'bar'
        };
        this.set('Content-Type', 'application/json; charset=utf-8');
        this.set('Content-Length', '15');
        this.set('Transfer-Encoding', 'chunked');
        this.status = status;
        assert(this.response.header['content-type'] == null);
        assert(this.response.header['content-length'] == null);
        assert(this.response.header['transfer-encoding'] == null);
      });

      request(app.listen())
        .get('/')
        .expect(status)
        .end(function (err, res) {
          res.should.not.have.header('content-type');
          res.should.not.have.header('content-length');
          res.should.not.have.header('content-encoding');
          res.text.should.have.length(0);
          done(err);
        });
    });

    it('should strip content releated header fields after status set', function (done) {
      const app = new Koa();

      app.use(function * () {
        this.status = status;
        this.body = {
          foo: 'bar'
        };
        this.set('Content-Type', 'application/json; charset=utf-8');
        this.set('Content-Length', '15');
        this.set('Transfer-Encoding', 'chunked');
      });

      request(app.listen())
        .get('/')
        .expect(status)
        .end(function (err, res) {
          res.should.not.have.header('content-type');
          res.should.not.have.header('content-length');
          res.should.not.have.header('content-encoding');
          res.text.should.have.length(0);
          done(err);
        });
    });
  }

  describe('when 204', function () {
    strip(204);
  });

  describe('when 205', function () {
    strip(205);
  });

  describe('when 304', function () {
    strip(304);
  });
});
