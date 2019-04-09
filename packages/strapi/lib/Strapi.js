'use strict';

// Dependencies.
const http = require('http');
const path = require('path');
const cluster = require('cluster');
const { EventEmitter } = require('events');
const Koa = require('koa');
const { includes, get, assign, toLower } = require('lodash');
const { logger, models } = require('strapi-utils');
const stackTrace = require('stack-trace');
const utils = require('./utils');
const { nestedConfigurations, appConfigurations, apis, middlewares, hooks, plugins, admin, store } = require('./core');
const initializeMiddlewares = require('./middlewares');
const initializeHooks = require('./hooks');

/* eslint-disable prefer-template */
/* eslint-disable no-console */
/* eslint-disable indent */
/**
 * Construct an Strapi instance.
 *
 * @constructor
 */

class Strapi extends EventEmitter {
  constructor() {
    super();

    this.setMaxListeners(100);

    this.reload = this.reload();

    // Expose `koa`.
    this.app = new Koa();

    // Mount the HTTP server.
    this.server = http.createServer(this.app.callback());

    // Logger.
    this.log = logger;

    // Utils.
    this.utils = {
      models,
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
      environment: toLower(process.env.NODE_ENV) || 'development',
      environments: {},
      admin: {},
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
        views: 'views',
      },
      middleware: {},
      hook: {},
      functions: {},
      routes: {},
    };

    // Bind context functions.
    this.loadFile = utils.loadFile.bind(this);
  }

  async start(config = {}, cb) {
    try {
      this.config = assign(this.config, config);

      // Emit starting event.
      this.emit('server:starting');

      // Load the app.
      await this.load();
      // Run bootstrap function.
      await this.bootstrap();
      // Freeze object.
      await this.freeze();
      // Update source admin.
      await admin.call(this);
      // Init first start
      utils.init.call(this);
      // Launch server.
      this.server.listen(this.config.port, async err => {
        if (err) {
          this.log.debug(`⚠️ Server wasn't able to start properly.`);
          this.log.error(err);
          return this.stop();
        }

        this.log.info('Time: ' + new Date());
        this.log.info('Launched in: ' + (Date.now() - this.config.launchedAt) + ' ms');
        this.log.info('Environment: ' + this.config.environment);
        this.log.info('Process PID: ' + process.pid);
        this.log.info(`Version: ${this.config.info.strapi} (node v${this.config.info.node})`);
        this.log.info('To shut down your server, press <CTRL> + C at any time');
        console.log();
        this.log.info(`☄️  Admin panel: ${this.config.admin.url}`);
        this.log.info(`⚡️ Server: ${this.config.url}`);
        console.log();

        // Emit started event.
        this.emit('server:started');

        if (cb && typeof cb === 'function') {
          cb();
        }

        if (
          (this.config.environment === 'development' &&
            get(this.config.currentEnvironment, 'server.admin.autoOpen', true) !== false) ||
          this.config.init
        ) {
          await utils.openBrowser.call(this);
        }
      });
    } catch (err) {
      this.log.debug(`⛔️ Server wasn't able to start properly.`);
      this.log.error(err);
      console.log(err);
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

    this.server.on('error', err => {
      if (err.code === 'EADDRINUSE') {
        this.log.debug(`⛔️ Server wasn't able to start properly.`);
        this.log.error(`The port ${err.port} is already used by another application.`);
        this.stop();
        return;
      }

      console.error(err);
    });

    this.server.destroy = cb => {
      this.server.close(cb);

      for (let key in connections) {
        connections[key].destroy();
      }
    };
  }

  stop() {
    // Destroy server and available connections.
    this.server.destroy();

    if (
      cluster.isWorker &&
      this.config.environment === 'development' &&
      get(this.config, 'currentEnvironment.server.autoReload.enabled', true) === true
    ) {
      process.send('stop');
    }

    // Kill process.
    process.exit(1);
  }

  async load() {
    await this.enhancer();

    this.app.use(async (ctx, next) => {
      if (ctx.request.url === '/_health' && ctx.request.method === 'HEAD') {
        ctx.set('strapi', 'You are so French!');
        ctx.status = 204;
      } else {
        await next();
      }
    });

    // Create AST.
    await Promise.all([nestedConfigurations.call(this), apis.call(this), middlewares.call(this), hooks.call(this)]);

    // Populate AST with configurations.
    await appConfigurations.call(this);

    // Usage.
    await utils.usage.call(this);

    // Init core store
    await store.call(this);

    // Initialize hooks and middlewares.
    await Promise.all([initializeMiddlewares.call(this), initializeHooks.call(this)]);

    // Harmonize plugins configuration.
    await plugins.call(this);
  }

  reload() {
    const state = {
      shouldReload: 0,
    };

    const reload = function() {
      if (state.shouldReload > 0) {
        // Reset the reloading state
        state.shouldReload -= 1;
        reload.isReloading = false;
        return;
      }

      if (
        cluster.isWorker &&
        this.config.environment === 'development' &&
        get(this.config, 'currentEnvironment.server.autoReload.enabled', true) === true
      ) {
        this.server.close();
        process.send('reload');
      }
    };

    Object.defineProperty(reload, 'isWatching', {
      configurable: true,
      enumerable: true,
      set: value => {
        // Special state when the reloader is disabled temporarly (see GraphQL plugin example).
        if (state.isWatching === false && value === true) {
          state.shouldReload += 1;
        }
        state.isWatching = value;
      },
      get: () => {
        return state.isWatching;
      },
    });

    reload.isReloading = false;
    reload.isWatching = true;

    return reload;
  }

  async bootstrap() {
    const execBootstrap = fn =>
      !fn
        ? Promise.resolve()
        : new Promise((resolve, reject) => {
            const timeoutMs = this.config.bootstrapTimeout || 3500;
            const timer = setTimeout(() => {
              this.log.warn(`Bootstrap is taking unusually long to execute its callback ${timeoutMs} miliseconds).`);
              this.log.warn('Perhaps you forgot to call it?');
            }, timeoutMs);

            let ranBootstrapFn = false;

            try {
              fn(err => {
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

    return Promise.all(Object.values(this.plugins).map(x => execBootstrap(get(x, 'config.functions.bootstrap')))).then(
      () => execBootstrap(this.config.functions.bootstrap),
    );
  }

  async freeze() {
    const propertiesToNotFreeze = this.propertiesToNotFreeze || [];

    // Remove object from tree.
    delete this.propertiesToNotFreeze;

    return Object.keys(this)
      .filter(x => !includes(propertiesToNotFreeze, x))
      .forEach(key => {
        Object.freeze(this[key]);
      });
  }

  query(entity, plugin) {
    if (!entity) {
      return this.log.error(`You can't call the query method without passing the model's name as a first argument.`);
    }

    const model = entity.toLowerCase();

    let Model;

    if (plugin === 'admin') {
      Model = get(strapi.admin, ['models', model], undefined);
    } else {
      Model = get(strapi.plugins, [plugin, 'models', model]) || get(strapi, ['models', model]) || undefined;
    }

    if (!Model) {
      return this.log.error(`The model ${model} can't be found.`);
    }

    const connector = Model.orm;

    if (!connector) {
      return this.log.error(`Impossible to determine the use ORM for the model ${model}.`);
    }

    // Get stack trace.
    const stack = stackTrace.get()[1];
    const file = stack.getFileName();
    // const method = stack.getFunctionName();

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
    } else if (plugin === 'admin') {
      pluginPath = 'admin';
    }

    if (!pluginPath) {
      return this.log.error('Impossible to find the plugin where `strapi.query` has been called.');
    }

    // Get plugin name.
    const pluginName = pluginPath.replace('strapi-plugin-', '').toLowerCase();
    const queries =
      pluginPath === 'admin'
        ? get(this.admin, `config.queries.${connector}`)
        : get(this.plugins, `${pluginName}.config.queries.${connector}`);

    if (!queries) {
      return this.log.error(`There is no query available for the model ${model}.`);
    }

    // Bind queries with the current model to allow the use of `this`.
    const bindQueries = Object.keys(queries).reduce(
      (acc, current) => {
        return (acc[current] = queries[current].bind(Model)), acc;
      },
      {
        orm: connector,
        primaryKey: Model.primaryKey,
        associations: Model.associations,
      },
    );

    return bindQueries;
  }
}

module.exports = new Strapi();
