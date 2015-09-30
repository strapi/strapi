'use strict';

const request = require('../helpers/context').request;

describe('req.headers', function () {
  it('should return the request header object', function () {
    const req = request();
    req.headers.should.equal(req.req.headers);
  });
});
