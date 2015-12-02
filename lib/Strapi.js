'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');
const events = require('events');
const util = require('util');

// Public node modules.
const winston = require('winston');

// Local dependencies.
const loadStrapi = require('./load');
const mixinAfter = require('./private/after');

/**
 * Construct an Strapi instance.
 *
 * @constructor
 */

function Strapi() {

  // Inherit methods from `EventEmitter`.
  events.EventEmitter.call(this);

  // Remove memory-leak warning about max listeners.
  this.setMaxListeners(0);

  // Mixin `load()` method to load the pieces of a Strapi application.
  this.load = loadStrapi(this);

  // Mixin support for `Strapi.prototype.after()`.
  mixinAfter(this);

  // Bind `this` context for all `Strapi.prototype.*` methods.
  this.load = this.load.bind(this);
  this.start = this.start.bind(this);
  this.stop = this.stop.bind(this);
  this.restart = this.restart.bind(this);
  this.initialize = this.initialize.bind(this);
  this.exposeGlobals = this.exposeGlobals.bind(this);
  this.runBootstrap = this.runBootstrap.bind(this);
  this.isLocalStrapiValid = this.isLocalStrapiValid.bind(this);
  this.isStrapiAppSync = this.isStrapiAppSync.bind(this);

  // Expose `koa`.
  this.server = require('koa');
  this.app = require('koa')();

  // Expose every middleware inside `strapi.middlewares`.
  this.middlewares = require('koa-load-middlewares')({
    config: path.resolve(__dirname, '..', 'package.json'),
    pattern: ['koa-*', 'koa.*'],
    scope: ['dependencies', 'devDependencies'],
    replaceString: /^koa(-|\.)/,
    camelize: true
  });

  // New Winston logger.
  this.log = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({
        level: 'debug',
        colorize: 'level'
      })
    ]
  });
}

// Extend from `EventEmitter` to allow hooks to listen to stuff.
util.inherits(Strapi, events.EventEmitter);

/**
 * Public methods
 */

Strapi.prototype.start = require('./start');
Strapi.prototype.stop = require('./stop');
Strapi.prototype.restart = require('./restart');
Strapi.prototype.server = require('koa');
Strapi.prototype.app = require('koa')();

Strapi.prototype.middlewares = require('koa-load-middlewares')({
  config: path.resolve(__dirname, '..', 'package.json'),
  pattern: ['koa-*', 'koa.*'],
  scope: ['dependencies', 'devDependencies'],
  replaceString: /^koa(-|\.)/,
  camelize: true
});

Strapi.prototype.log = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      level: 'debug',
      colorize: 'level'
    })
  ]
});

/**
 * Private methods
 */

Strapi.prototype.initialize = require('./private/initialize');
Strapi.prototype.exposeGlobals = require('./private/exposeGlobals');
Strapi.prototype.runBootstrap = require('./private/bootstrap');
Strapi.prototype.isLocalStrapiValid = require('./private/isLocalStrapiValid');
Strapi.prototype.isStrapiAppSync = require('./private/isStrapiAppSync');

/**
 * Expose Strapi constructor
 */

module.exports = Strapi;
