'use strict';

const request = require('../helpers/context').request;

describe('req.ip', function () {
  describe('with req.ips present', function () {
    it('should return req.ips[0]', function () {
      const req = request();
      req.app.proxy = true;
      req.header['x-forwarded-for'] = '127.0.0.1';
      req.socket.remoteAddress = '127.0.0.2';
      req.ip.should.equal('127.0.0.1');
    });
  });

  describe('with no req.ips present', function () {
    it('should return req.socket.removeAddress', function () {
      const req = request();
      req.socket.remoteAddress = '127.0.0.2';
      req.ip.should.equal('127.0.0.2');
    });
  });
});
