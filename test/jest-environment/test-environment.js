'use strict';

// eslint-disable-next-line node/no-extraneous-require
const NodeEnvironment = require('jest-environment-node');
// eslint-disable-next-line node/no-extraneous-require
const strapi = require('strapi');
const path = require('path');

class TestEnvironment extends NodeEnvironment {
  constructor(config) {
    super(config);
  }

  async setup() {
    await super.setup();

    const options = { dir: path.resolve(__dirname, '../../testApp') };
    const strapiInstance = await strapi(options).load();

    await strapiInstance.app
      // Populate Koa routes
      .use(strapiInstance.router.routes())
      // Populate Koa methods
      .use(strapiInstance.router.allowedMethods());

    this.global.strapi = strapiInstance;
  }

  async teardown() {
    await super.teardown();

    global.strapi.server.destroy();
  }
}

module.exports = TestEnvironment;
