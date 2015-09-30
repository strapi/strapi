'use strict';

const fs = require('fs');

const should = require('should');
const assert = require('assert');

const response = require('../helpers/context').response;

describe('res.length', function () {
  describe('when Content-Length is defined', function () {
    it('should return a number', function () {
      const res = response();
      res.header['content-length'] = '120';
      res.length.should.equal(120);
    });
  });
});

describe('res.length', function () {
  describe('when Content-Length is defined', function () {
    it('should return a number', function () {
      const res = response();
      res.set('Content-Length', '1024');
      res.length.should.equal(1024);
    });
  });

  describe('when Content-Length is not defined', function () {
    describe('and a .body is set', function () {
      it('should return a number', function () {
        const res = response();

        res.body = 'foo';
        res.remove('Content-Length');
        res.length.should.equal(3);

        res.body = 'foo';
        res.length.should.equal(3);

        res.body = new Buffer('foo bar');
        res.remove('Content-Length');
        res.length.should.equal(7);

        res.body = new Buffer('foo bar');
        res.length.should.equal(7);

        res.body = {
          hello: 'world'
        };
        res.remove('Content-Length');
        res.length.should.equal(17);

        res.body = {
          hello: 'world'
        };
        res.length.should.equal(17);

        res.body = fs.createReadStream('package.json');
        should.not.exist(res.length);

        res.body = null;
        should.not.exist(res.length);
      });
    });

    describe('and .body is not', function () {
      it('should return undefined', function () {
        const res = response();
        assert(res.length == null);
      });
    });
  });
});
