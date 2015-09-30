'use strict';

const context = require('../helpers/context');

describe('ctx.querystring=', function () {
  it('should replace the querystring', function () {
    const ctx = context({
      url: '/store/shoes'
    });
    ctx.querystring = 'page=2&color=blue';
    ctx.url.should.equal('/store/shoes?page=2&color=blue');
    ctx.querystring.should.equal('page=2&color=blue');
  });

  it('should update ctx.search and ctx.query', function () {
    const ctx = context({
      url: '/store/shoes'
    });
    ctx.querystring = 'page=2&color=blue';
    ctx.url.should.equal('/store/shoes?page=2&color=blue');
    ctx.search.should.equal('?page=2&color=blue');
    ctx.query.should.eql({
      page: '2',
      color: 'blue'
    });
  });

  it('should change .url but not .originalUrl', function () {
    const ctx = context({
      url: '/store/shoes'
    });
    ctx.querystring = 'page=2&color=blue';
    ctx.url.should.equal('/store/shoes?page=2&color=blue');
    ctx.originalUrl.should.equal('/store/shoes');
    ctx.request.originalUrl.should.equal('/store/shoes');
  });
});
