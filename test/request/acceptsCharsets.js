'use strict';

const context = require('../helpers/context');

describe('ctx.acceptsCharsets()', function () {
  describe('with no arguments', function () {
    describe('when Accept-Charset is populated', function () {
      it('should return accepted types', function () {
        const ctx = context();
        ctx.req.headers['accept-charset'] = 'utf-8, iso-8859-1;q=0.2, utf-7;q=0.5';
        ctx.acceptsCharsets().should.eql(['utf-8', 'utf-7', 'iso-8859-1']);
      });
    });
  });

  describe('with multiple arguments', function () {
    describe('when Accept-Charset is populated', function () {
      describe('if any types match', function () {
        it('should return the best fit', function () {
          const ctx = context();
          ctx.req.headers['accept-charset'] = 'utf-8, iso-8859-1;q=0.2, utf-7;q=0.5';
          ctx.acceptsCharsets('utf-7', 'utf-8').should.equal('utf-8');
        });
      });

      describe('if no types match', function () {
        it('should return false', function () {
          const ctx = context();
          ctx.req.headers['accept-charset'] = 'utf-8, iso-8859-1;q=0.2, utf-7;q=0.5';
          ctx.acceptsCharsets('utf-16').should.be.false;
        });
      });
    });

    describe('when Accept-Charset is not populated', function () {
      it('should return the first type', function () {
        const ctx = context();
        ctx.acceptsCharsets('utf-7', 'utf-8').should.equal('utf-7');
      });
    });
  });

  describe('with an array', function () {
    it('should return the best fit', function () {
      const ctx = context();
      ctx.req.headers['accept-charset'] = 'utf-8, iso-8859-1;q=0.2, utf-7;q=0.5';
      ctx.acceptsCharsets(['utf-7', 'utf-8']).should.equal('utf-8');
    });
  });
});
