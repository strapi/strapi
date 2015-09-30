'use strict';

const assert = require('assert');

const context = require('../helpers/context');

describe('ctx.assert(value, status)', function () {
  it('should throw an error', function () {
    const ctx = context();

    try {
      ctx.assert(false, 404);
      throw new Error('asdf');
    } catch (err) {
      assert(err.status === 404);
      assert(err.expose);
    }
  });
});
