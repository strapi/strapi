'use strict';

const context = require('../helpers/context');

describe('ctx.remove(name)', function () {
  it('should remove a field', function () {
    const ctx = context();
    ctx.set('x-foo', 'bar');
    ctx.remove('x-foo');
    ctx.response.header.should.eql({});
  });
});
