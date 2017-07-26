'use strict';

const assert = require('assert');
const strapi = require('../lib/');


  /**
   * No need to test everything about Koa middlewares.
   * We just need need to make sure that they all are
   * correctly required and loaded inside `strapi`.
   */
  describe('middlewares', () => {
    before(function(done) {
      // runs before all tests in this block
      strapi.start(() => {
        done();
      });
    });

    it('`strapi.middlewares` should be an object', () => {
      assert(typeof strapi.middlewares === 'object');
    });

    it('`strapi.middlewares.parser` should be a function', () => {
      assert(typeof strapi.middlewares.parser.load.initialize === 'function');
    });

    it('`strapi.middlewares.compress` should be a function', () => {
      assert(typeof strapi.middlewares.compress.load.initialize === 'function');
    });

    it('`strapi.middlewares.kcors` should be a function', () => {
      assert(typeof strapi.middlewares.cors.load.initialize === 'function');
    });

    it('`strapi.middlewares.favicon` should be a function', () => {
      assert(typeof strapi.middlewares.favicon.load.initialize === 'function');
    });

    it('`strapi.middlewares.gzip` should be a function', () => {
      assert(typeof strapi.middlewares.gzip.load.initialize === 'function');
    });

    it('`strapi.middlewares.language` should be a function', () => {
      assert(typeof strapi.middlewares.language.load.initialize === 'function');
    });

    it('`strapi.middlewares.ip` should be a function', () => {
      assert(typeof strapi.middlewares.ip.load.initialize === 'function');
    });

    it('`strapi.middlewares.logger` should be a function', () => {
      assert(typeof strapi.middlewares.logger.load.initialize === 'function');
    });

    it('`strapi.middlewares.lusca` should be a function', () => {
      assert(typeof strapi.middlewares.lusca.load.initialize === 'function');
    });

    it('`strapi.middlewares.proxy` should be a function', () => {
      assert(typeof strapi.middlewares.proxy.load.initialize === 'function');
    });

    it('`strapi.middlewares.responses` should be a function', () => {
      assert(typeof strapi.middlewares.responses.load.initialize === 'function');
    });

    it('`strapi.middlewares.responseTime` should be a function', () => {
      assert(typeof strapi.middlewares.responseTime.load.initialize === 'function');
    });

    it('`strapi.middlewares.router` should be a function', () => {
      assert(typeof strapi.middlewares.router.load.initialize === 'function');
    });

    it('`strapi.middlewares.genericSession` should be a function', () => {
      assert(typeof strapi.middlewares.session.load.initialize === 'function');
    });

    it('`strapi.middlewares.sslify` should be a function', () => {
      assert(typeof strapi.middlewares.ssl.load.initialize === 'function');
    });

    it('`strapi.middlewares.betterStatic` should be a function', () => {
      assert(typeof strapi.middlewares.static.load.initialize === 'function');
    });

    it('`strapi.middlewares.views` should be a function', () => {
      assert(typeof strapi.middlewares.views.load.initialize === 'function');
    });
  });
