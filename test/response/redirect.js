'use strict';

const context = require('../helpers/context');

describe('ctx.redirect(url)', function () {
  it('should redirect to the given url', function () {
    const ctx = context();
    ctx.redirect('http://google.com');
    ctx.response.header.location.should.equal('http://google.com');
    ctx.status.should.equal(302);
  });

  describe('with "back"', function () {
    it('should redirect to Referrer', function () {
      const ctx = context();
      ctx.req.headers.referrer = '/login';
      ctx.redirect('back');
      ctx.response.header.location.should.equal('/login');
    });

    it('should redirect to Referer', function () {
      const ctx = context();
      ctx.req.headers.referer = '/login';
      ctx.redirect('back');
      ctx.response.header.location.should.equal('/login');
    });

    it('should default to alt', function () {
      const ctx = context();
      ctx.redirect('back', '/index.html');
      ctx.response.header.location.should.equal('/index.html');
    });

    it('should default redirect to /', function () {
      const ctx = context();
      ctx.redirect('back');
      ctx.response.header.location.should.equal('/');
    });
  });

  describe('when html is accepted', function () {
    it('should respond with html', function () {
      const ctx = context();
      const url = 'http://google.com';
      ctx.header.accept = 'text/html';
      ctx.redirect(url);
      ctx.response.header['content-type'].should.equal('text/html; charset=utf-8');
      ctx.body.should.equal('Redirecting to <a href="' + url + '">' + url + '</a>.');
    });

    it('should escape the url', function () {
      const ctx = context();
      let url = '<script>';
      ctx.header.accept = 'text/html';
      ctx.redirect(url);
      url = escape(url);
      ctx.response.header['content-type'].should.equal('text/html; charset=utf-8');
      ctx.body.should.equal('Redirecting to <a href="' + url + '">' + url + '</a>.');
    });
  });

  describe('when text is accepted', function () {
    it('should respond with text', function () {
      const ctx = context();
      const url = 'http://google.com';
      ctx.header.accept = 'text/plain';
      ctx.redirect(url);
      ctx.body.should.equal('Redirecting to ' + url + '.');
    });
  });

  describe('when status is 301', function () {
    it('should not change the status code', function () {
      const ctx = context();
      const url = 'http://google.com';
      ctx.status = 301;
      ctx.header.accept = 'text/plain';
      ctx.redirect('http://google.com');
      ctx.status.should.equal(301);
      ctx.body.should.equal('Redirecting to ' + url + '.');
    });
  });

  describe('when status is 304', function () {
    it('should change the status code', function () {
      const ctx = context();
      const url = 'http://google.com';
      ctx.status = 304;
      ctx.header.accept = 'text/plain';
      ctx.redirect('http://google.com');
      ctx.status.should.equal(302);
      ctx.body.should.equal('Redirecting to ' + url + '.');
    });
  });

  describe('when content-type was present', function () {
    it('should overwrite content-type', function () {
      const ctx = context();
      ctx.body = {};
      const url = 'http://google.com';
      ctx.header.accept = 'text/plain';
      ctx.redirect('http://google.com');
      ctx.status.should.equal(302);
      ctx.body.should.equal('Redirecting to ' + url + '.');
      ctx.type.should.equal('text/plain');
    });
  });
});

function escape(html) {
  return String(html)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
