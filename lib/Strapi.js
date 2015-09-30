'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');
const events = require('events');
const util = require('util');

// Public node modules.
const _ = require('lodash');
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
  this.load = _.bind(this.load, this);
  this.start = _.bind(this.start, this);
  this.stop = _.bind(this.stop, this);
  this.rebuild = _.bind(this.rebuild, this);
  this.initialize = _.bind(this.initialize, this);
  this.exposeGlobals = _.bind(this.exposeGlobals, this);
  this.runBootstrap = _.bind(this.runBootstrap, this);
  this.isLocalStrapiValid = _.bind(this.isLocalStrapiValid, this);
  this.isStrapiAppSync = _.bind(this.isStrapiAppSync, this);

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
Strapi.prototype.rebuild = require('./rebuild');
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
