'use strict';

const assert = require('assert');

const request = require('../helpers/context').request;

describe('req.charset', function () {
  describe('with no content-type present', function () {
    it('should return ""', function () {
      const req = request();
      assert(req.charset === '');
    });
  });

  describe('with charset present', function () {
    it('should return ""', function () {
      const req = request();
      req.header['content-type'] = 'text/plain';
      assert(req.charset === '');
    });
  });

  describe('with a charset', function () {
    it('should return the charset', function () {
      const req = request();
      req.header['content-type'] = 'text/plain; charset=utf-8';
      req.charset.should.equal('utf-8');
    });
  });
});
