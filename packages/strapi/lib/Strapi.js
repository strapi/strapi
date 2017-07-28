'use strict';

// Dependencies.
const Koa = require('koa');
const utils = require('./utils');
const http = require('http');
const path = require('path');
const { nestedConfigurations, appConfigurations, apis, plugins, admin, middlewares, hooks } = require('./core');
const initializeMiddlewares = require('./middlewares');
const initializeHooks = require('./hooks');
const { logger } = require('strapi-utils');
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
      launchedAt: Date.now(),
      appPath: process.cwd(),
      host: process.env.HOST || process.env.HOSTNAME || 'localhost',
      port: process.env.PORT || 1337,
      environment: process.env.NODE_ENV || 'development',
      environments: {},
      paths: {
        admin: 'admin',
        api: 'api',
        config: 'config',
        controllers: 'controllers',
        models: 'models',
        plugins: 'plugins',
        policies: 'policies',
        tmp: '.tmp',
        services: 'services',
        static: 'public',
        validators: 'validators',
        views: 'views'
      },
      middleware: {},
      hook: {},
      functions: {}
    };

    // Bind context functions.
    this.loadFile = utils.loadFile.bind(this);
  }

  async start(cb) {
    try {
      // Disable log when running tests.
      if (this.config.environment === 'test') {
        this.log.configure({
          level: 'silent'
        });
      }

      // Enhance app.
      await this.enhancer();
      // Load the app.
      await this.load();
      // Run bootstrap function.
      await this.bootstrap();
      // Launch server.
      this.server.listen(this.config.port || 1337, err => {
        if (err) {
          console.log(err);
        }

        this.log.info('Server started in ' + this.config.appPath);
        this.log.info('Your server is running at ' + this.config.url);
        this.log.debug('Time: ' + new Date());
        this.log.debug('Launched in: ' + (Date.now() - this.config.launchedAt) + ' ms');
        this.log.debug('Environment: ' + this.config.environment);
        this.log.debug('Process PID: ' + process.pid);
        this.log.debug(`Version: ${this.config.info.strapi} (node v${this.config.info.node})`);
        this.log.info('To shut down your server, press <CTRL> + C at any time');

        if (cb && typeof cb === 'function') {
          cb();
        }
      });
    } catch (e) {
      this.log.debug(`Server wasn't able to start properly.`);
      this.log.error(e);
      this.stop();
    }
  }

  async enhancer() {
    const connections = {};

    this.server.on('connection', conn => {
      const key = conn.remoteAddress + ':' + conn.remotePort;
      connections[key] = conn;

      conn.on('close', function() {
       delete connections[key];
      });
    });

    this.server.destroy = cb => {
      this.server.close(cb);

      for (let key in connections) {
        connections[key].destroy();
      };
    };
  }

  stop() {
    // Destroy server and available connections.
    this.server.destroy();
    // Kill process.
    process.exit(0);
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

    // Populate AST with configurations.
    await appConfigurations.call(this);

    // Initialize hooks and middlewares.
    await Promise.all([
      initializeMiddlewares.call(this),
      initializeHooks.call(this)
    ]);
  }

  async bootstrap() {
    if (!this.config.functions.bootstrap) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const timeoutMs = this.config.bootstrapTimeout || 3500;
      const timer = setTimeout(() => {
        this.log.warn(`Bootstrap is taking unusually long to execute its callback ${timeoutMs} miliseconds).`);
        this.log.warn('Perhaps you forgot to call it?');
      }, timeoutMs);

      let ranBootstrapFn = false;

      try {
        this.config.functions.bootstrap(err => {
          if (ranBootstrapFn) {
            this.log.error('You called the callback in `strapi.config.boostrap` more than once!');

            return reject();
          }

          ranBootstrapFn = true;
          clearTimeout(timer);

          return resolve(err);
        });
      } catch (e) {
        if (ranBootstrapFn) {
          this.log.error('The bootstrap function threw an error after its callback was called.');

          return reject(e);
        }

        ranBootstrapFn = true;
        clearTimeout(timer);

        return resolve(e);
      }
    });
  }
}

module.exports = new Strapi();
