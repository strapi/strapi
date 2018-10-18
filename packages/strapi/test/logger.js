'use strict';

const assert = require('assert');

const strapi = require('../lib/');

/**
 * Make sure the logger works correctly.
 */

describe('logger', () => {
  it('`strapi.log` should be an object', () => {
    assert(typeof strapi.log === 'object');
  });

  it('`strapi.log.info` should be a function', () => {
    assert(typeof strapi.log.info === 'function');
  });

  it('`strapi.log.warn` should be a function', () => {
    assert(typeof strapi.log.warn === 'function');
  });

  it('`strapi.log.error` should be a function', () => {
    assert(typeof strapi.log.error === 'function');
  });
});
