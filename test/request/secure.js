'use strict';

const request = require('../helpers/context').request;

describe('req.secure', function () {
  it('should return true when encrypted', function () {
    const req = request();
    req.req.socket = {
      encrypted: true
    };
    req.secure.should.be.true;
  });
});
