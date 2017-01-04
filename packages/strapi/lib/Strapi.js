'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');
const http = require('http');
const EventEmitter = require('events').EventEmitter;

// Local dependencies.
const Koa = require('koa');
const mixinAfter = require('./private/after');

/**
 * Construct an Strapi instance.
 *
 * @constructor
 */

 // Private properties
let _instance = null;

class Strapi extends EventEmitter {

  constructor() {
    super();

    // Singleton
    if (!_instance) {
      _instance = this;
    }

    // Remove memory-leak warning about max listeners.
    this.setMaxListeners(0);

    // Mixin support for `Strapi.prototype.after()`.
    mixinAfter(this);

    // Expose `koa`.
    this.app = new Koa();

    // Mount the HTTP server.
    this.server = new http.Server(this.app.callback());

    // Expose every middleware inside `strapi.middlewares`.
    this.middlewares = require('koa-load-middlewares')({
      config: path.resolve(__dirname, '..', 'package.json'),
      pattern: ['koa-*', 'koa.*', 'k*'],
      scope: ['dependencies', 'devDependencies'],
      replaceString: /^koa(-|\.)/,
      camelize: true,
      lazy: false
    });

    // New Winston logger.
    this.log = require('strapi-utils').logger;

    return _instance;
  }

  // Method to initialize instance
  initialize(cb) {
    require('./private/initialize').apply(this, [cb]);
  }

  // Method to load instance
  load(configOverride, cb) {
    require('./load').apply(this, [configOverride, cb]);
  }

  // Method to start instance
  start(configOverride, cb) {
    require('./start').apply(this, [configOverride, cb]);
  }

  // Method to stop instance
  stop() {
    require('./stop').apply(this);
  }

  // Method to expose instance globals
  exposeGlobals(cb) {
    require('./private/exposeGlobals').apply(this, [cb]);
  }

  // Method to run instance bootstrap
  runBootstrap(cb) {
    require('./private/bootstrap').apply(this, [cb]);
  }

  // Method to verify strapi dependency
  isLocalStrapiValid(strapiPath, appPath) {
    require('./private/isLocalStrapiValid').apply(this, [strapiPath, appPath]);
  }

  // Method to verify strapi application
  isStrapiAppSync(appPath) {
    require('./private/isStrapiAppSync').apply(this, [appPath]);
  }
}

module.exports = new Strapi();
