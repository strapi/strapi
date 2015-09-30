'use strict';

const context = require('../helpers/context');

describe('ctx.acceptsEncodings()', function () {
  describe('with no arguments', function () {
    describe('when Accept-Encoding is populated', function () {
      it('should return accepted types', function () {
        const ctx = context();
        ctx.req.headers['accept-encoding'] = 'gzip, compress;q=0.2';
        ctx.acceptsEncodings().should.eql(['gzip', 'compress', 'identity']);
        ctx.acceptsEncodings('gzip', 'compress').should.equal('gzip');
      });
    });

    describe('when Accept-Encoding is not populated', function () {
      it('should return identity', function () {
        const ctx = context();
        ctx.acceptsEncodings().should.eql(['identity']);
        ctx.acceptsEncodings('gzip', 'deflate', 'identity').should.equal('identity');
      });
    });
  });

  describe('with multiple arguments', function () {
    it('should return the best fit', function () {
      const ctx = context();
      ctx.req.headers['accept-encoding'] = 'gzip, compress;q=0.2';
      ctx.acceptsEncodings('compress', 'gzip').should.eql('gzip');
      ctx.acceptsEncodings('gzip', 'compress').should.eql('gzip');
    });
  });

  describe('with an array', function () {
    it('should return the best fit', function () {
      const ctx = context();
      ctx.req.headers['accept-encoding'] = 'gzip, compress;q=0.2';
      ctx.acceptsEncodings(['compress', 'gzip']).should.eql('gzip');
    });
  });
});
