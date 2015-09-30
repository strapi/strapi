'use strict';

const context = require('../helpers/context');

describe('req.stale', function () {
  it('should be the inverse of req.fresh', function () {
    const ctx = context();
    ctx.status = 200;
    ctx.method = 'GET';
    ctx.req.headers['if-none-match'] = '"123"';
    ctx.set('ETag', '"123"');
    ctx.fresh.should.be.true;
    ctx.stale.should.be.false;
  });
});
