'use strict';

const assert = require('assert');

const context = require('../helpers/context');

describe('ctx.type=', function () {
  describe('with a mime', function () {
    it('should set the Content-Type', function () {
      const ctx = context();
      ctx.type = 'text/plain';
      ctx.type.should.equal('text/plain');
      ctx.response.header['content-type'].should.equal('text/plain; charset=utf-8');
    });
  });

  describe('with an extension', function () {
    it('should lookup the mime', function () {
      const ctx = context();
      ctx.type = 'json';
      ctx.type.should.equal('application/json');
      ctx.response.header['content-type'].should.equal('application/json; charset=utf-8');
    });
  });

  describe('without a charset', function () {
    it('should default the charset', function () {
      const ctx = context();
      ctx.type = 'text/html';
      ctx.type.should.equal('text/html');
      ctx.response.header['content-type'].should.equal('text/html; charset=utf-8');
    });
  });

  describe('with a charset', function () {
    it('should not default the charset', function () {
      const ctx = context();
      ctx.type = 'text/html; charset=foo';
      ctx.type.should.equal('text/html');
      ctx.response.header['content-type'].should.equal('text/html; charset=foo');
    });
  });

  describe('with an unknown extension', function () {
    it('should default to application/octet-stream', function () {
      const ctx = context();
      ctx.type = 'asdf';
      ctx.type.should.equal('application/octet-stream');
      ctx.response.header['content-type'].should.equal('application/octet-stream');
    });
  });
});

describe('ctx.type', function () {
  describe('with no Content-Type', function () {
    it('should return ""', function () {
      const ctx = context();
      assert(ctx.type === '');
    });
  });

  describe('with a Content-Type', function () {
    it('should return the mime', function () {
      const ctx = context();
      ctx.type = 'json';
      ctx.type.should.equal('application/json');
    });
  });
});
