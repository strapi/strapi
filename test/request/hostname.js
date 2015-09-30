'use strict';

const assert = require('assert');

const request = require('../helpers/context').request;

describe('req.hostname', function () {
  it('should return hostname void of port', function () {
    const req = request();
    req.header.host = 'foo.com:3000';
    req.hostname.should.equal('foo.com');
  });

  describe('with no host present', function () {
    it('should return ""', function () {
      const req = request();
      assert.equal(req.hostname, '');
    });
  });

  describe('when X-Forwarded-Host is present', function () {
    describe('and proxy is not trusted', function () {
      it('should be ignored', function () {
        const req = request();
        req.header['x-forwarded-host'] = 'bar.com';
        req.header['host'] = 'foo.com';
        req.hostname.should.equal('foo.com');
      });
    });

    describe('and proxy is trusted', function () {
      it('should be used', function () {
        const req = request();
        req.app.proxy = true;
        req.header['x-forwarded-host'] = 'bar.com, baz.com';
        req.header['host'] = 'foo.com';
        req.hostname.should.equal('bar.com');
      });
    });
  });
});
