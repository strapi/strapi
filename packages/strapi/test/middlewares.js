'use strict';

const assert = require('assert');
const strapi = require('../lib/');


  /**
   * No need to test everything about Koa middleware.
   * We just need need to make sure that they all are
   * correctly required and loaded inside `strapi`.
   */
  describe('middleware', () => {
    before(function(done) {
      // runs before all tests in this block
      strapi.start({
        port: 1338
      }, () => {
        done();
      });
    });

    it('`strapi.middleware` should be an object', () => {
      assert(typeof strapi.middleware === 'object');
    });

    it('`strapi.middleware.cors` should be a function', () => {
      assert(typeof strapi.middleware.cors.load.initialize === 'function');
    });

    it('`strapi.middleware.cron` should be a function', () => {
      assert(typeof strapi.middleware.cron.load.initialize === 'function');
    });

    it('`strapi.middleware.csp` should be a function', () => {
      assert(typeof strapi.middleware.csp.load.initialize === 'function');
    });

    it('`strapi.middleware.csrf` should be a function', () => {
      assert(typeof strapi.middleware.csrf.load.initialize === 'function');
    });

    it('`strapi.middleware.favicon` should be a function', () => {
      assert(typeof strapi.middleware.favicon.load.initialize === 'function');
    });

    it('`strapi.middleware.gzip` should be a function', () => {
      assert(typeof strapi.middleware.gzip.load.initialize === 'function');
    });

    it('`strapi.middleware.hsts` should be a function', () => {
      assert(typeof strapi.middleware.hsts.load.initialize === 'function');
    });

    it('`strapi.middleware.ip` should be a function', () => {
      assert(typeof strapi.middleware.ip.load.initialize === 'function');
    });

    it('`strapi.middleware.language` should be a function', () => {
      assert(typeof strapi.middleware.language.load.initialize === 'function');
    });

    it('`strapi.middleware.logger` should be a function', () => {
      assert(typeof strapi.middleware.logger.load.initialize === 'function');
    });

    it('`strapi.middleware.p3p` should be a function', () => {
      assert(typeof strapi.middleware.p3p.load.initialize === 'function');
    });

    it('`strapi.middleware.parser` should be a function', () => {
      assert(typeof strapi.middleware.parser.load.initialize === 'function');
    });

    it('`strapi.middleware.public` should be a function', () => {
      assert(typeof strapi.middleware.public.load.initialize === 'function');
    });

    it('`strapi.middleware.responses` should not be a function', () => {
      assert(typeof strapi.middleware.responses.load.initialize === "function");
    });

    it('`strapi.middleware.responseTime` should be a function', () => {
      assert(typeof strapi.middleware.responseTime.load.initialize === 'function');
    });

    it('`strapi.middleware.router` should be a function', () => {
      assert(typeof strapi.middleware.router.load.initialize === 'function');
    });

    it('`strapi.middleware.session` should be a function', () => {
      assert(typeof strapi.middleware.session.load.initialize === 'function');
    });

    it('`strapi.middleware.xframe` should be a function', () => {
      assert(typeof strapi.middleware.xframe.load.initialize === 'function');
    });

    it('`strapi.middleware.xss` should be a function', () => {
      assert(typeof strapi.middleware.xss.load.initialize === 'function');
    });
  });
