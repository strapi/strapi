'use strict';

const request = require('../helpers/context').request;

describe('ctx.idempotent', function () {
  describe('when the request method is idempotent', function () {
    it('should return true', function () {
      ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE'].forEach(check);

      function check(method) {
        const req = request();
        req.method = method;
        req.idempotent.should.equal(true);
      }
    });
  });

  describe('when the request method is not idempotent', function () {
    it('should return false', function () {
      const req = request();
      req.method = 'POST';
      req.idempotent.should.equal(false);
    });
  });
});
