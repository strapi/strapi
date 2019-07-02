'use strict';

// Dependencies.
const http = require('http');
const path = require('path');
const { EventEmitter } = require('events');
const fse = require('fs-extra');
const Koa = require('koa');
const _ = require('lodash');
const { logger, models } = require('strapi-utils');
const utils = require('./utils');
const {
  loadConfig,
  loadApis,
  loadAdmin,
  loadPlugins,
  loadMiddlewares,
  loadHooks,
  bootstrap,
  loadExtensions,
  initCoreStore,
} = require('./core');
const initializeMiddlewares = require('./middlewares');
const initializeHooks = require('./hooks');
const createStrapiFs = require('./core/fs');
const getPrefixedDeps = require('./utils/get-prefixed-dependencies');
const defaultQueries = require('./core-api/queries');

/**
 * Construct an Strapi instance.
 *
 * @constructor
 */

class Strapi extends EventEmitter {
  constructor({ dir, autoReload = false } = {}) {
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

    this.dir = dir || process.cwd();
    const pkgJSON = require(path.resolve(this.dir, 'package.json'));

    // Default configurations.
    this.config = {
      launchedAt: Date.now(),
      appPath: this.dir,
      autoReload,
      host: process.env.HOST || process.env.HOSTNAME || 'localhost',
      port: process.env.PORT || 1337,
      environment: _.toLower(process.env.NODE_ENV) || 'development',
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
      info: pkgJSON,
      installedPlugins: getPrefixedDeps('strapi-plugin', pkgJSON),
      installedMiddlewares: getPrefixedDeps('strapi-middleware', pkgJSON),
      installedHooks: getPrefixedDeps('strapi-hook', pkgJSON),
    };

    this.fs = createStrapiFs(this);
    this.requireProjectBootstrap();
  }

  requireProjectBootstrap() {
    const bootstrapPath = path.resolve(
      this.dir,
      'config/functions/bootstrap.js'
    );

    if (fse.existsSync(bootstrapPath)) {
      require(bootstrapPath);
    }
  }

  async start(cb) {
    try {
      // Emit starting event.
      this.emit('server:starting');

      await this.load();
      // Run bootstrap function.
      await this.runBootstrapFunctions();
      // Freeze object.
      await this.freeze();
      // Init first start
      utils.init(this.config);

      // Launch server.
      this.server.listen(this.config.port, async err => {
        if (err) return this.stopWithError(err);

        this.log.info('Time: ' + new Date());
        this.log.info(
          'Launched in: ' + (Date.now() - this.config.launchedAt) + ' ms'
        );
        this.log.info('Environment: ' + this.config.environment);
        this.log.info('Process PID: ' + process.pid);
        this.log.info(
          `Version: ${this.config.info.strapi} (node v${this.config.info.node})`
        );
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
            _.get(
              this.config.currentEnvironment,
              'server.admin.autoOpen',
              true
            ) !== false) ||
          this.config.init
        ) {
          await utils.openBrowser.call(this);
        }
      });
    } catch (err) {
      this.stopWithError(err);
    }
  }

  /**
   * Add behaviors to the server
   */
  async enhancer() {
    // handle port in use cleanly
    this.server.on('error', err => {
      if (err.code === 'EADDRINUSE') {
        return this.stopWithError(
          `The port ${err.port} is already used by another application.`
        );
      }

      this.log.error(err);
    });

    // Close current connections to fully destroy the server
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
      }
    };
  }

  stopWithError(err) {
    this.log.debug(`⛔️ Server wasn't able to start properly.`);
    this.log.error(err);
    return this.stop();
  }

  stop() {
    // Destroy server and available connections.
    this.server.destroy();

    if (this.config.autoReload) {
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

    const [
      config,
      api,
      admin,
      plugins,
      middlewares,
      hook,
      extensions,
    ] = await Promise.all([
      loadConfig(this),
      loadApis(this),
      loadAdmin(this),
      loadPlugins(this),
      loadMiddlewares(this),
      loadHooks(this.config),
      loadExtensions(this.config),
    ]);

    _.merge(this.config, config);

    this.api = api;
    this.admin = admin;
    this.plugins = plugins;
    this.middleware = middlewares;
    this.hook = hook;

    /**
     * Handle plugin extensions
     */
    // merge extensions config folders
    _.mergeWith(this.plugins, extensions.merges, (objValue, srcValue, key) => {
      // concat routes
      if (_.isArray(srcValue) && _.isArray(objValue) && key === 'routes') {
        return srcValue.concat(objValue);
      }
    });
    // overwrite plugins with extensions overwrites
    extensions.overwrites.forEach(({ path, mod }) =>
      _.set(this.plugins, path, mod)
    );

    // Populate AST with configurations.

    await bootstrap(this);

    // Usage.
    await utils.usage(this.config);

    // Init core store
    initCoreStore(this);

    // Initialize hooks and middlewares.

    await Promise.all([
      initializeMiddlewares.call(this),
      initializeHooks.call(this),
    ]).catch(err => {
      console.error(err);
      throw err;
    });
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

      if (this.config.autoReload) {
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

  async runBootstrapFunctions() {
    const execBootstrap = fn => {
      if (!fn) return Promise.resolve();

      return new Promise((resolve, reject) => {
        const timeoutMs = this.config.bootstrapTimeout || 3500;
        const timer = setTimeout(() => {
          this.log.warn(
            `The bootstrap function is taking unusually long to execute (${timeoutMs} miliseconds).`
          );
          this.log.warn('Make sure you call it?');
        }, timeoutMs);

        let ranBootstrapFn = false;

        try {
          fn(err => {
            if (ranBootstrapFn) {
              this.log.error(
                'You called the callback in `strapi.config.boostrap` more than once!'
              );

              return reject();
            }

            ranBootstrapFn = true;
            clearTimeout(timer);

            return resolve(err);
          });
        } catch (e) {
          if (ranBootstrapFn) {
            this.log.error(
              'The bootstrap function threw an error after its callback was called.'
            );

            return reject(e);
          }

          ranBootstrapFn = true;
          clearTimeout(timer);

          return resolve(e);
        }
      });
    };

    return Promise.all(
      Object.values(this.plugins).map(plugin =>
        execBootstrap(_.get(plugin, 'config.functions.bootstrap'))
      )
    ).then(() => execBootstrap(this.config.functions.bootstrap));
  }

  async freeze() {
    const propertiesToNotFreeze = this.propertiesToNotFreeze || [];

    // Remove object from tree.
    delete this.propertiesToNotFreeze;

    return Object.keys(this)
      .filter(x => !_.includes(propertiesToNotFreeze, x))
      .forEach(key => {
        Object.freeze(this[key]);
      });
  }

  /**
   * Binds queries with a specific model
   * @param {string} entity - entity name
   * @param {string} plugin - plugin name or null
   * @param {Object} queriesMap - a map of orm to queries object factory (defaults to ./core-api/queries)
   */
  query(entity, plugin, queriesMap = defaultQueries) {
    if (!entity) {
      throw new Error(
        `You can't call the query method without passing the model's name as a first argument.`
      );
    }

    const modelKey = entity.toLowerCase();

    const model =
      plugin === 'admin'
        ? _.get(strapi.admin, ['models', modelKey], undefined)
        : _.get(strapi.plugins, [plugin, 'models', modelKey]) ||
          _.get(strapi, ['models', modelKey]) ||
          undefined;

    if (!model) {
      throw new Error(`The model ${modelKey} can't be found.`);
    }

    const connector = model.orm;

    if (!connector) {
      throw new Error(
        `Impossible to determine the use ORM for the model ${modelKey}.`
      );
    }

    let buildQueries = queriesMap[connector];
    let queries = buildQueries({ model, modelKey, strapi: this });

    return Object.assign(queries, {
      orm: connector,
      primaryKey: model.primaryKey,
      associations: model.associations,
    });
  }
}

module.exports = options => {
  const strapi = new Strapi(options);
  global.strapi = strapi;
  return strapi;
};
