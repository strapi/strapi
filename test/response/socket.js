'use strict';

const Stream = require('stream');

const response = require('../helpers/context').response;

describe('res.socket', function () {
  it('should return the request socket object', function () {
    const res = response();
    res.socket.should.be.instanceOf(Stream);
  });
});
