'use strict';

const context = require('../helpers/context');

describe('ctx.vary(field)', function () {
  describe('when Vary is not set', function () {
    it('should set it', function () {
      const ctx = context();
      ctx.vary('Accept');
      ctx.response.header.vary.should.equal('Accept');
    });
  });

  describe('when Vary is set', function () {
    it('should append', function () {
      const ctx = context();
      ctx.vary('Accept');
      ctx.vary('Accept-Encoding');
      ctx.response.header.vary.should.equal('Accept, Accept-Encoding');
    });
  });

  describe('when Vary already contains the value', function () {
    it('should not append', function () {
      const ctx = context();
      ctx.vary('Accept');
      ctx.vary('Accept-Encoding');
      ctx.vary('Accept');
      ctx.vary('Accept-Encoding');
      ctx.response.header.vary.should.equal('Accept, Accept-Encoding');
    });
  });
});
