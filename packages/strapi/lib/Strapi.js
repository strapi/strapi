'use strict';

// Dependencies.
const Koa = require('koa');
const utils = require('./utils');
const { nestedConfigurations, appConfigurations, apis, plugins, admin, middlewares, hooks } = require('./core');
const initializeMiddlewares = require('./middlewares');
const initializeHooks = require('./hooks');
const { logger } = require('strapi-utils');
const { http } = require('uws');
const { EventEmitter } = require('events');

/**
 * Construct an Strapi instance.
 *
 * @constructor
 */

class Strapi extends EventEmitter {
  constructor() {
    super();

    this.setMaxListeners(15);

    // Expose `koa`.
    this.app = new Koa();

    // Mount the HTTP server.
    this.server = http.createServer(this.app.callback());

    // Winston logger.
    this.log = logger;

    // Default configurations.
    this.config = {
      appPath: process.cwd(),
      host: process.env.HOST || process.env.HOSTNAME || 'localhost',
      port: process.env.PORT || 1337,
      environment: process.env.NODE_ENV || 'development',
      paths: {
        tmp: '.tmp',
        config: 'config',
        static: 'public',
        views: 'views',
        api: 'api',
        controllers: 'controllers',
        services: 'services',
        policies: 'policies',
        models: 'models',
        plugins: 'plugins',
        validators: 'validators',
        admin: 'admin'
      }
    };

    // Bind context functions.
    this.loadFile = utils.loadFile.bind(this);
  }

  async start() {
    try {
      global.startedAt = Date.now();

      await this.load();


      this.server.listen(1337, err => {
        if (err) {
          console.log(err);
        }

        this.log.info('Server started in ' + this.config.appPath);
        this.log.info('Your server is running at ' + this.config.url);
        this.log.debug('Time: ' + new Date());
        this.log.debug(
          'Launched in: ' + (Date.now() - global.startedAt) + ' milliseconds'
        );
        this.log.debug('Environment: ' + this.config.environment);
        this.log.debug('Process PID: ' + process.pid);
        this.log.info('To shut down your server, press <CTRL> + C at any time');
      });
    } catch (error) {
      console.error(error);
    }
  }

  stop() {
    this.server.destroy();
  }

  async load() {
    // Create AST.
    await Promise.all([
      nestedConfigurations.call(this),
      apis.call(this),
      plugins.call(this),
      admin.call(this),
      middlewares.call(this),
      hooks.call(this)
    ]);

    await appConfigurations.call(this);

    await Promise.all([
      initializeMiddlewares.call(this),
      initializeHooks.call(this)
    ]);
  }
}

module.exports = new Strapi();
