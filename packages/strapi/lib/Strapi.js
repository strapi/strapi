'use strict';

// Dependencies.
const Koa = require('koa');
const utils = require('./utils');
const http = require('http');
const path = require('path');
const cluster = require('cluster');
const { includes, get } = require('lodash');
const { logger, models } = require('strapi-utils');
const { nestedConfigurations, appConfigurations, apis, middlewares, hooks } = require('./core');
const initializeMiddlewares = require('./middlewares');
const initializeHooks = require('./hooks');
const { EventEmitter } = require('events');
const stackTrace = require('stack-trace');

/**
 * Construct an Strapi instance.
 *
 * @constructor
 */

class Strapi extends EventEmitter {
  constructor() {
    super();

    this.setMaxListeners(15);

    this.reload = this.reload();

    // Expose `koa`.
    this.app = new Koa();

    // Mount the HTTP server.
    this.server = http.createServer(this.app.callback());

    // Logger.
    this.log = logger;

    // Utils.
    this.utils = {
      models
    };

    // Exclude EventEmitter, Koa and HTTP server to be freezed.
    this.propertiesToNotFreeze = Object.keys(this);

    // Expose `admin`.
    this.admin = {};

    // Expose `plugin`.
    this.plugins = {};

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
      functions: {},
      routes: {}
    };

    // Bind context functions.
    this.loadFile = utils.loadFile.bind(this);
  }

  async start(config = {}, cb) {
    try {
      // Enhance app.
      await this.enhancer();
      // Load the app.
      await this.load();
      // Run bootstrap function.
      await this.bootstrap();
      // Freeze object.
      await this.freeze();
      // Launch server.
      this.server.listen(config.port || this.config.port, err => {
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

    if (cluster.isWorker && process.env.NODE_ENV === 'development' && get(this.config, 'currentEnvironment.server.autoReload.enabled') === true) {
      process.send('stop');
    }

    // Kill process.
    process.exit(0);
  }

  async load() {
    this.app.use(async (ctx, next) => {
      if (ctx.request.url === '/_health' && ctx.request.method === 'HEAD') {
        ctx.set('strapi', 'You are so French !');
        ctx.status = 204;
      } else {
        await next();
      }
    });

    // Create AST.
    await Promise.all([
      nestedConfigurations.call(this),
      apis.call(this),
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

  reload() {
    const reload = function() {
      if (cluster.isWorker && process.env.NODE_ENV === 'development' && get(this.config, 'currentEnvironment.server.autoReload.enabled') === true) process.send('reload');
    };

    reload.isReloading = false;
    reload.isWatching = true;

    return reload;
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

  async freeze() {
    const propertiesToNotFreeze = this.propertiesToNotFreeze || [];

    // Remove object from tree.
    delete this.propertiesToNotFreeze;

    return Object.keys(this).filter(x => !includes(propertiesToNotFreeze, x)).forEach(key => {
      Object.freeze(this[key]);
    });
  }

  query(entity) {
    if (!entity) {
      return this.log.error(`You can't call the query method without passing the model's name as a first argument.`);
    }

    const model = entity.toLowerCase();

    if (!this.models.hasOwnProperty(model)) {
      return this.log.error(`The model ${model} can't be found.`);
    }

    const connector = this.models[model].orm;

    if (!connector) {
      return this.log.error(`Impossible to determine the use ORM for the model ${model}.`);
    }

    // Get stack trace.
    const stack = stackTrace.get()[1];
    const file = stack.getFileName();
    const method = stack.getFunctionName();

    // Extract plugin path.
    let pluginPath = undefined;

    if (file.indexOf('strapi-plugin-') !== -1) {
      pluginPath = file.split(path.sep).filter(x => x.indexOf('strapi-plugin-') !== -1)[0];
    } else if (file.indexOf(path.sep + 'plugins' + path.sep) !== -1) {
      const pathTerms = file.split(path.sep);
      const index = pathTerms.indexOf('plugins');

      if (index !== -1) {
        pluginPath = pathTerms[index + 1];
      }
    }

    if (!pluginPath) {
      return this.log.error('Impossible to find the plugin where `strapi.query` has been called.');
    }

    // Get plugin name.
    const pluginName = pluginPath.replace('strapi-plugin-', '').toLowerCase();
    const queries = get(this.plugins, `${pluginName}.config.queries.${connector}`);

    if (!queries) {
      return this.log.error(`There is no query available for the model ${model}.`);
    }

    // Bind queries with the current model to allow the use of `this`.
    const bindQueries = Object.keys(queries).reduce((acc, current) => {
      return acc[current] = queries[current].bind(this.models[model]), acc;
    }, {});

    // Send ORM to the called function.
    bindQueries.orm = connector;

    return bindQueries;
  }
}

module.exports = new Strapi();
