'use strict';

const assert = require('assert');

const request = require('../helpers/context').request;

describe('ctx.length', function () {
  it('should return length in content-length', function () {
    const req = request();
    req.header['content-length'] = '10';
    req.length.should.equal(10);
  });

  describe('with no content-length present', function () {
    const req = request();
    assert(req.length == null);
  });
});
