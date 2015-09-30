'use strict';

const context = require('../helpers/context');

describe('ctx.get(name)', function () {
  it('should return the field value', function () {
    const ctx = context();
    ctx.req.headers.host = 'http://google.com';
    ctx.req.headers.referer = 'http://google.com';
    ctx.get('HOST').should.equal('http://google.com');
    ctx.get('Host').should.equal('http://google.com');
    ctx.get('host').should.equal('http://google.com');
    ctx.get('referer').should.equal('http://google.com');
    ctx.get('referrer').should.equal('http://google.com');
  });
});
