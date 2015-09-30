'use strict';

const context = require('../helpers/context');

describe('ctx.fresh', function () {
  describe('the request method is not GET and HEAD', function () {
    it('should return false', function () {
      const ctx = context();
      ctx.req.method = 'POST';
      ctx.fresh.should.be.false;
    });
  });

  describe('the response is non-2xx', function () {
    it('should return false', function () {
      const ctx = context();
      ctx.status = 404;
      ctx.req.method = 'GET';
      ctx.req.headers['if-none-match'] = '123';
      ctx.set('ETag', '123');
      ctx.fresh.should.be.false;
    });
  });

  describe('the response is 2xx', function () {
    describe('and etag matches', function () {
      it('should return true', function () {
        const ctx = context();
        ctx.status = 200;
        ctx.req.method = 'GET';
        ctx.req.headers['if-none-match'] = '123';
        ctx.set('ETag', '123');
        ctx.fresh.should.be.true;
      });
    });

    describe('and etag do not match', function () {
      it('should return false', function () {
        const ctx = context();
        ctx.status = 200;
        ctx.req.method = 'GET';
        ctx.req.headers['if-none-match'] = '123';
        ctx.set('ETag', 'hey');
        ctx.fresh.should.be.false;
      });
    });
  });
});
