'use strict';

// Dependencies.
const http = require('http');
const path = require('path');
const cluster = require('cluster');
const { EventEmitter } = require('events');
const Koa = require('koa');
const _ = require('lodash');
const { logger, models } = require('strapi-utils');
const stackTrace = require('stack-trace');
const utils = require('./utils');
const {
  loadConfigs,
  loadApis,
  loadMiddlewares,
  loadHooks,
  bootstrap,
  plugins,
  admin,
  initCoreStore,
} = require('./core');
const initializeMiddlewares = require('./middlewares');
const initializeHooks = require('./hooks');

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
    };
  }

  async start(config = {}, cb) {
    try {
      this.config = _.assign(this.config, config);

      // Emit starting event.
      this.emit('server:starting');
      // Load the app.
      await this.load();
      // Run bootstrap function.
      await this.runBootstrapFunctions();
      // Freeze object.
      await this.freeze();
      // Update source admin.
      await admin.call(this);
      // Init first start
      utils.init.call(this);
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

    if (
      cluster.isWorker &&
      this.config.environment === 'development' &&
      _.get(
        this.config,
        'currentEnvironment.server.autoReload.enabled',
        true
      ) === true
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

    this.config.info = require(path.resolve(
      this.config.appPath,
      'package.json'
    ));

    this.config.installedPlugins = Object.keys(this.config.info.dependencies)
      .filter(d => d.startsWith('strapi-plugin'))
      .map(pkgName => pkgName.substring('strapi-plugin'.length + 1));

    this.config.installedMiddlewares = Object.keys(
      this.config.info.dependencies
    )
      .filter(d => d.startsWith('strapi-middleware'))
      .map(pkgName => pkgName.substring('strapi-middleware'.length + 1));

    this.config.installedHooks = Object.keys(this.config.info.dependencies)
      .filter(d => d.startsWith('strapi-hook'))
      .map(pkgName => pkgName.substring('strapi-hook'.length + 1));

    // load configs
    _.merge(this, await loadConfigs(this.config));
    // load apis
    _.merge(this, await loadApis(this.config));

    // load middlewares
    const { middlewares, koaMiddlewares } = await loadMiddlewares(this.config);
    this.middleware = middlewares;
    this.koaMiddlewares = koaMiddlewares;

    // load hooks
    this.hook = await loadHooks(this.config);

    // Populate AST with configurations.
    await bootstrap.call(this);
    // Usage.
    await utils.usage(this.config);
    // Init core store
    initCoreStore(this);
    // Initialize hooks and middlewares.
    await Promise.all([
      initializeMiddlewares.call(this),
      initializeHooks.call(this),
    ]);

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
        _.get(
          this.config,
          'currentEnvironment.server.autoReload.enabled',
          true
        ) === true
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

  query(entity, plugin) {
    if (!entity) {
      return this.log.error(
        `You can't call the query method without passing the model's name as a first argument.`
      );
    }

    const model = entity.toLowerCase();

    let Model;
    if (plugin === 'admin') {
      Model = _.get(strapi.admin, ['models', model], undefined);
    } else {
      Model = _.get(strapi.plugins, [plugin, 'models', model]) || get(strapi, ['models', model]) || undefined;
    }

    if (!Model) {
      return this.log.error(`The model ${model} can't be found.`);
    }

    const connector = Model.orm;

    if (!connector) {
      return this.log.error(
        `Impossible to determine the use ORM for the model ${model}.`
      );
    }

    // Get stack trace.
    const stack = stackTrace.get()[1];
    const file = stack.getFileName();
    // const method = stack.getFunctionName();

    // Extract plugin path.
    let pluginPath = undefined;

    if (file.indexOf('strapi-plugin-') !== -1) {
      pluginPath = file
        .split(path.sep)
        .filter(x => x.indexOf('strapi-plugin-') !== -1)[0];
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
      return this.log.error(
        'Impossible to find the plugin where `strapi.query` has been called.'
      );
    }

    // Get plugin name.
    const pluginName = pluginPath.replace('strapi-plugin-', '').toLowerCase();
    const queries =
      pluginPath === 'admin'
        ? _.get(this.admin, `config.queries.${connector}`)
        : _.get(this.plugins, `${pluginName}.config.queries.${connector}`);

    if (!queries) {
      return this.log.error(
        `There is no query available for the model ${model}.`
      );
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
