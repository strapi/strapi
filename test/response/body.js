'use strict';

const fs = require('fs');

const assert = require('assert');

const response = require('../helpers/context').response;

describe('res.body=', function () {
  describe('when Content-Type is set', function () {
    it('should not override', function () {
      const res = response();
      res.type = 'png';
      res.body = new Buffer('something');
      assert(res.header['content-type'] === 'image/png');
    });

    describe('when body is an object', function () {
      it('should override as json', function () {
        const res = response();

        res.body = '<em>hey</em>';
        assert(res.header['content-type'] === 'text/html; charset=utf-8');

        res.body = {
          foo: 'bar'
        };
        assert(res.header['content-type'] === 'application/json; charset=utf-8');
      });
    });

    it('should override length', function () {
      const res = response();
      res.type = 'html';
      res.body = 'something';
      res.length.should.equal(9);
    });
  });

  describe('when a string is given', function () {
    it('should default to text', function () {
      const res = response();
      res.body = 'Tobi';
      assert(res.header['content-type'] === 'text/plain; charset=utf-8');
    });

    it('should set length', function () {
      const res = response();
      res.body = 'Tobi';
      assert(res.header['content-length'] === '4');
    });

    describe('and contains a non-leading <', function () {
      it('should default to text', function () {
        const res = response();
        res.body = 'aklsdjf < klajsdlfjasd';
        assert(res.header['content-type'] === 'text/plain; charset=utf-8');
      });
    });
  });

  describe('when an html string is given', function () {
    it('should default to html', function () {
      const res = response();
      res.body = '<h1>Tobi</h1>';
      assert(res.header['content-type'] === 'text/html; charset=utf-8');
    });

    it('should set length', function () {
      const string = '<h1>Tobi</h1>';
      const res = response();
      res.body = string;
      assert.equal(res.length, Buffer.byteLength(string));
    });

    it('should set length when body is overridden', function () {
      const string = '<h1>Tobi</h1>';
      const res = response();
      res.body = string;
      res.body = string + string;
      assert.equal(res.length, 2 * Buffer.byteLength(string));
    });

    describe('when it contains leading whitespace', function () {
      it('should default to html', function () {
        const res = response();
        res.body = '    <h1>Tobi</h1>';
        assert(res.header['content-type'] === 'text/html; charset=utf-8');
      });
    });
  });

  describe('when an xml string is given', function () {
    it('should default to html', function () {
      const res = response();
      res.body = '<?xml version="1.0" encoding="UTF-8"?>\n<俄语>данные</俄语>';
      assert(res.header['content-type'] === 'text/html; charset=utf-8');
    });
  });

  describe('when a stream is given', function () {
    it('should default to an octet stream', function () {
      const res = response();
      res.body = fs.createReadStream('LICENSE');
      assert(res.header['content-type'] === 'application/octet-stream');
    });
  });

  describe('when a buffer is given', function () {
    it('should default to an octet stream', function () {
      const res = response();
      res.body = new Buffer('hey');
      assert(res.header['content-type'] === 'application/octet-stream');
    });

    it('should set length', function () {
      const res = response();
      res.body = new Buffer('Tobi');
      assert(res.header['content-length'] === '4');
    });
  });

  describe('when an object is given', function () {
    it('should default to json', function () {
      const res = response();
      res.body = {
        foo: 'bar'
      };
      assert(res.header['content-type'] === 'application/json; charset=utf-8');
    });
  });
});
