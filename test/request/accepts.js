'use strict';

const context = require('../helpers/context');

describe('ctx.accepts(types)', function () {
  describe('with no arguments', function () {
    describe('when Accept is populated', function () {
      it('should return all accepted types', function () {
        const ctx = context();
        ctx.req.headers.accept = 'application/*;q=0.2, image/jpeg;q=0.8, text/html, text/plain';
        ctx.accepts().should.eql(['text/html', 'text/plain', 'image/jpeg', 'application/*']);
      });
    });
  });

  describe('with no valid types', function () {
    describe('when Accept is populated', function () {
      it('should return false', function () {
        const ctx = context();
        ctx.req.headers.accept = 'application/*;q=0.2, image/jpeg;q=0.8, text/html, text/plain';
        ctx.accepts('image/png', 'image/tiff').should.be.false;
      });
    });

    describe('when Accept is not populated', function () {
      it('should return the first type', function () {
        const ctx = context();
        ctx.accepts('text/html', 'text/plain', 'image/jpeg', 'application/*').should.equal('text/html');
      });
    });
  });

  describe('when extensions are given', function () {
    it('should convert to mime types', function () {
      const ctx = context();
      ctx.req.headers.accept = 'text/plain, text/html';
      ctx.accepts('html').should.equal('html');
      ctx.accepts('.html').should.equal('.html');
      ctx.accepts('txt').should.equal('txt');
      ctx.accepts('.txt').should.equal('.txt');
      ctx.accepts('png').should.be.false;
    });
  });

  describe('when an array is given', function () {
    it('should return the first match', function () {
      const ctx = context();
      ctx.req.headers.accept = 'text/plain, text/html';
      ctx.accepts(['png', 'text', 'html']).should.equal('text');
      ctx.accepts(['png', 'html']).should.equal('html');
    });
  });

  describe('when multiple arguments are given', function () {
    it('should return the first match', function () {
      const ctx = context();
      ctx.req.headers.accept = 'text/plain, text/html';
      ctx.accepts('png', 'text', 'html').should.equal('text');
      ctx.accepts('png', 'html').should.equal('html');
    });
  });

  describe('when present in Accept as an exact match', function () {
    it('should return the type', function () {
      const ctx = context();
      ctx.req.headers.accept = 'text/plain, text/html';
      ctx.accepts('text/html').should.equal('text/html');
      ctx.accepts('text/plain').should.equal('text/plain');
    });
  });

  describe('when present in Accept as a type match', function () {
    it('should return the type', function () {
      const ctx = context();
      ctx.req.headers.accept = 'application/json, */*';
      ctx.accepts('text/html').should.equal('text/html');
      ctx.accepts('text/plain').should.equal('text/plain');
      ctx.accepts('image/png').should.equal('image/png');
    });
  });

  describe('when present in Accept as a subtype match', function () {
    it('should return the type', function () {
      const ctx = context();
      ctx.req.headers.accept = 'application/json, text/*';
      ctx.accepts('text/html').should.equal('text/html');
      ctx.accepts('text/plain').should.equal('text/plain');
      ctx.accepts('image/png').should.be.false;
    });
  });
});
