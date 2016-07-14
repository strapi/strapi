'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');
const http = require('http');
const EventEmitter = require('events').EventEmitter;
const util = require('util');

// Local dependencies.
const loadStrapi = require('./load');
const mixinAfter = require('./private/after');

/**
 * Construct an Strapi instance.
 *
 * @constructor
 */

module.exports = class Strapi extends EventEmitter {

  constructor() {
    super();

    // Remove memory-leak warning about max listeners.
    this.setMaxListeners(0);

    // Mixin support for `Strapi.prototype.after()`.
    mixinAfter(this);

    // Private method to load instance
    this.load = loadStrapi(this);

    // Private method to initialize instance
    this.initialize = cb => {
      require('./private/initialize').apply(this, [cb]);
    };

    // Private method to start instance
    this.start = (configOverride, cb) => {
      require('./start').apply(this, [configOverride, cb]);
    }

    // Private method to stop instance
    this.stop = () => {
      require('./stop').apply(this);
    }

    // Private method to expose instance globals
    this.exposeGlobals = cb => {
      require('./private/exposeGlobals').apply(this, [cb]);
    }

    // Private method to run instance bootstrap
    this.runBootstrap = cb => {
      require('./private/bootstrap').apply(this, [cb]);
    }

    // Private method to verify strapi dependency
    this.isLocalStrapiValid = (strapiPath, appPath) => {
      require('./private/isLocalStrapiValid').apply(this, [strapiPath, appPath]);
    }

    // Private method to verify strapi application
    this.isStrapiAppSync = appPath => {
      require('./private/isStrapiAppSync').apply(this, [appPath]);
    }

    // Expose `koa`.
    this.app = require('koa')();

    // Mount the HTTP server.
    this.server = http.Server(this.app.callback());

    // Expose every middleware inside `strapi.middlewares`.
    this.middlewares = require('koa-load-middlewares')({
      config: path.resolve(__dirname, '..', 'package.json'),
      pattern: ['koa-*', 'koa.*'],
      scope: ['dependencies', 'devDependencies'],
      replaceString: /^koa(-|\.)/,
      camelize: true
    });

    // New Winston logger.
    this.log = require('strapi-utils').logger;
  }
};
