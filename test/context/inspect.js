'use strict';

const context = require('../helpers/context');

describe('ctx.inspect()', function () {
  it('should return a json representation', function () {
    const ctx = context();
    const toJSON = ctx.toJSON(ctx);

    toJSON.should.eql(ctx.inspect());
  });
});
