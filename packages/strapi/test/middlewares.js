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

    it('`strapi.middlewares.cors` should be a function', () => {
      assert(typeof strapi.middlewares.cors.load.initialize === 'function');
    });

    it('`strapi.middlewares.cron` should be a function', () => {
      assert(typeof strapi.middlewares.cron.load.initialize === 'function');
    });

    it('`strapi.middlewares.csp` should be a function', () => {
      assert(typeof strapi.middlewares.csp.load.initialize === 'function');
    });

    it('`strapi.middlewares.csrf` should be a function', () => {
      assert(typeof strapi.middlewares.csrf.load.initialize === 'function');
    });

    it('`strapi.middlewares.favicon` should be a function', () => {
      assert(typeof strapi.middlewares.favicon.load.initialize === 'function');
    });

    it('`strapi.middlewares.gzip` should be a function', () => {
      assert(typeof strapi.middlewares.gzip.load.initialize === 'function');
    });

    it('`strapi.middlewares.hsts` should be a function', () => {
      assert(typeof strapi.middlewares.hsts.load.initialize === 'function');
    });

    it('`strapi.middlewares.ip` should be a function', () => {
      assert(typeof strapi.middlewares.ip.load.initialize === 'function');
    });

    it('`strapi.middlewares.language` should be a function', () => {
      assert(typeof strapi.middlewares.language.load.initialize === 'function');
    });

    it('`strapi.middlewares.logger` should be a function', () => {
      assert(typeof strapi.middlewares.logger.load.initialize === 'function');
    });

    it('`strapi.middlewares.p3p` should be a function', () => {
      assert(typeof strapi.middlewares.p3p.load.initialize === 'function');
    });

    it('`strapi.middlewares.parser` should be a function', () => {
      assert(typeof strapi.middlewares.parser.load.initialize === 'function');
    });

    it('`strapi.middlewares.proxy` should be a function', () => {
      assert(typeof strapi.middlewares.proxy.load.initialize === 'function');
    });

    it('`strapi.middlewares.public` should be a function', () => {
      assert(typeof strapi.middlewares.public.load.initialize === 'function');
    });

    it('`strapi.middlewares.responses` should not be a function', () => {
      assert(typeof strapi.middlewares.responses === "undefined");
    });

    it('`strapi.middlewares.responseTime` should be a function', () => {
      assert(typeof strapi.middlewares.responseTime.load.initialize === 'function');
    });

    it('`strapi.middlewares.router` should be a function', () => {
      assert(typeof strapi.middlewares.router.load.initialize === 'function');
    });

    it('`strapi.middlewares.session` should be a function', () => {
      assert(typeof strapi.middlewares.session.load.initialize === 'function');
    });

    it('`strapi.middlewares.ssl` should be a function', () => {
      assert(typeof strapi.middlewares.ssl.load.initialize === 'function');
    });

    it('`strapi.middlewares.xframe` should be a function', () => {
      assert(typeof strapi.middlewares.xframe.load.initialize === 'function');
    });

    it('`strapi.middlewares.xss` should be a function', () => {
      assert(typeof strapi.middlewares.xss.load.initialize === 'function');
    });
  });
