'use strict';

const assert = require('assert');

const response = require('../helpers/context').response;

describe('res.inspect()', function () {
  describe('with no response.res present', function () {
    it('should return null', function () {
      const res = response();
      res.body = 'hello';
      delete res.res;
      assert(res.inspect() == null);
    });
  });

  it('should return a json representation', function () {
    const res = response();
    res.body = 'hello';

    res.inspect().should.eql({
      body: 'hello',
      status: 200,
      message: 'OK',
      header: {
        'content-length': '5',
        'content-type': 'text/plain; charset=utf-8'
      }
    });
  });
});
