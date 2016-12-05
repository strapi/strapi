'use strict';

const assert = require('assert');

const strapi = require('../lib/');

/**
 * No need to test everything about Koa.
 * We just need need to make sure that everything
 * is correctly required and loaded inside `strapi`.
 */

describe('application', () => {
  it('`strapi.app` should be an object', () => {
    assert(typeof strapi.app === 'object');
  });

  it('`strapi.app.use` should be a function', () => {
    assert(typeof strapi.app.use === 'function');
  });

  it('`strapi.app.context` should be an object', () => {
    assert(typeof strapi.app.context === 'object');
  });

  it('`strapi.app.request` should be an object', () => {
    assert(typeof strapi.app.request === 'object');
  });

  it('`strapi.app.response` should be an object', () => {
    assert(typeof strapi.app.response === 'object');
  });
});
