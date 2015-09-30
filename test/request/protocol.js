'use strict';

const request = require('../helpers/context').request;

describe('req.protocol', function () {
  describe('when encrypted', function () {
    it('should return "https"', function () {
      const req = request();
      req.req.socket = {
        encrypted: true
      };
      req.protocol.should.equal('https');
    });
  });

  describe('when unencrypted', function () {
    it('should return "http"', function () {
      const req = request();
      req.req.socket = {};
      req.protocol.should.equal('http');
    });
  });

  describe('when X-Forwarded-Proto is set', function () {
    describe('and proxy is trusted', function () {
      it('should be used', function () {
        const req = request();
        req.app.proxy = true;
        req.req.socket = {};
        req.header['x-forwarded-proto'] = 'https, http';
        req.protocol.should.equal('https');
      });

      describe('and X-Forwarded-Proto is empty', function () {
        it('should return "http"', function () {
          const req = request();
          req.app.proxy = true;
          req.req.socket = {};
          req.header['x-forwarded-proto'] = '';
          req.protocol.should.equal('http');
        });
      });
    });

    describe('and proxy is not trusted', function () {
      it('should not be used', function () {
        const req = request();
        req.req.socket = {};
        req.header['x-forwarded-proto'] = 'https, http';
        req.protocol.should.equal('http');
      });
    });
  });
});
