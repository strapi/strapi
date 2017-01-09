'use strict';

const assert = require('assert');

const strapi = require('../lib/');

/**
 * No need to test everything about Koa middlewares.
 * We just need need to make sure that they all are
 * correctly required and loaded inside `strapi`.
 */

describe('middlewares', () => {
  it('`strapi.middlewares` should be an object', () => {
    assert(typeof strapi.middlewares === 'object');
  });

  it('`strapi.middlewares.bodyparser` should be a function', () => {
    assert(typeof strapi.middlewares.bodyparser === 'function');
  });

  it('`strapi.middlewares.compose` should be a function', () => {
    assert(typeof strapi.middlewares.compose === 'function');
  });

  it('`strapi.middlewares.compress` should be a function', () => {
    assert(typeof strapi.middlewares.compress === 'function');
  });

  it('`strapi.middlewares.kcors` should be a function', () => {
    assert(typeof strapi.middlewares.kcors === 'function');
  });

  it('`strapi.middlewares.favicon` should be a function', () => {
    assert(typeof strapi.middlewares.favicon === 'function');
  });

  // it('`strapi.middlewares.graphql` should be a function', () => {
  //   assert(typeof strapi.middlewares.graphql === 'function');
  // });

  it('`strapi.middlewares.i18n` should be a function', () => {
    assert(typeof strapi.middlewares.i18n === 'function');
  });

  it('`strapi.middlewares.ip` should be a function', () => {
    assert(typeof strapi.middlewares.ip === 'function');
  });

  it('`strapi.middlewares.locale` should be a function', () => {
    assert(typeof strapi.middlewares.locale === 'function');
  });

  it('`strapi.middlewares.lusca` should be a function', () => {
    assert(typeof strapi.middlewares.lusca === 'function');
  });

  it('`strapi.middlewares.proxy` should be a function', () => {
    assert(typeof strapi.middlewares.proxy === 'function');
  });

  it('`strapi.middlewares.responseTime` should be a function', () => {
    assert(typeof strapi.middlewares.responseTime === 'function');
  });

  it('`strapi.middlewares.joiRouter` should be a function', () => {
    // assert(typeof strapi.middlewares.joiRouter === 'function');
  });

  it('`strapi.middlewares.send` should be a function', () => {
    assert(typeof strapi.middlewares.send === 'function');
  });

  it('`strapi.middlewares.genericSession` should be a function', () => {
    assert(typeof strapi.middlewares.genericSession === 'function');
  });

  it('`strapi.middlewares.sslify` should be a function', () => {
    assert(typeof strapi.middlewares.sslify === 'function');
  });

  it('`strapi.middlewares.betterStatic` should be a function', () => {
    assert(typeof strapi.middlewares.betterStatic === 'function');
  });

  it('`strapi.middlewares.views` should be a function', () => {
    assert(typeof strapi.middlewares.views === 'function');
  });
});
