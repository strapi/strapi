'use strict';

const assert = require('assert');

const strapi = require('../lib/');

/**
 * Make sure the logger works correctly.
 */

describe('logger', function () {
  it('`strapi.log` should be an object', function () {
    assert(typeof strapi.log === 'object');
  });

  it('`strapi.log.verbose` should be a function', function () {
    assert(typeof strapi.log.verbose === 'function');
  });

  it('`strapi.log.info` should be a function', function () {
    assert(typeof strapi.log.info === 'function');
  });

  it('`strapi.log.warn` should be a function', function () {
    assert(typeof strapi.log.warn === 'function');
  });

  it('`strapi.log.error` should be a function', function () {
    assert(typeof strapi.log.error === 'function');
  });
});
