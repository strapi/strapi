'use strict';

const assert = require('assert');

const strapi = require('../lib/');

/**
 * Make sure private functions are correctly
 * required and loaded.
 */

describe('core', () => {
  it('`strapi` should be an object', () => {
    assert(typeof strapi === 'object');
  });

  it('`strapi.load` should be a function', () => {
    assert(typeof strapi.load === 'function');
  });

  it('`strapi.initialize` should be a function', () => {
    assert(typeof strapi.initialize === 'function');
  });

  it('`strapi.exposeGlobals` should be a function', () => {
    assert(typeof strapi.exposeGlobals === 'function');
  });

  it('`strapi.isLocalStrapiValid` should be a function', () => {
    assert(typeof strapi.isLocalStrapiValid === 'function');
  });

  it('`strapi.isStrapiAppSync` should be a function', () => {
    assert(typeof strapi.isStrapiAppSync === 'function');
  });

  it('`strapi.runBootstrap` should be a function', () => {
    assert(typeof strapi.runBootstrap === 'function');
  });

  it('`strapi.server` should be a object', () => {
    assert(typeof strapi.server === 'object');
  });

  it('`strapi.start` should be a function', () => {
    assert(typeof strapi.start === 'function');
  });

  it('`strapi.stop` should be a function', () => {
    assert(typeof strapi.stop === 'function');
  });
});
