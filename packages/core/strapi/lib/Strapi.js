'use strict';

const Koa = require('koa');
const Router = require('koa-router');
const _ = require('lodash');
const { createLogger } = require('@strapi/logger');
const { Database } = require('@strapi/database');

const loadConfiguration = require('./core/app-configuration');

const { createHTTPServer } = require('./server');
const { createContainer } = require('./container');
const utils = require('./utils');
const initializeMiddlewares = require('./middlewares');
const createStrapiFs = require('./services/fs');
const createEventHub = require('./services/event-hub');
const createWebhookRunner = require('./services/webhook-runner');
const { webhookModel, createWebhookStore } = require('./services/webhook-store');
const { createCoreStore, coreStoreModel } = require('./services/core-store');
const createEntityService = require('./services/entity-service');
const entityValidator = require('./services/entity-validator');
const createTelemetry = require('./services/metrics');
const createUpdateNotifier = require('./utils/update-notifier');
const createStartupLogger = require('./utils/startup-logger');
const ee = require('./utils/ee');
const contentTypesRegistry = require('./core/registries/content-types');
const servicesRegistry = require('./core/registries/services');
const policiesRegistry = require('./core/registries/policies');
const middlewaresRegistry = require('./core/registries/middlewares');
const controllersRegistry = require('./core/registries/controllers');
const modulesRegistry = require('./core/registries/modules');
const pluginsRegistry = require('./core/registries/plugins');
const createConfigProvider = require('./core/registries/config');
const bootstrap = require('./core/bootstrap');
const loaders = require('./core/loaders');

const LIFECYCLES = {
  REGISTER: 'register',
  BOOTSTRAP: 'bootstrap',
};

class Strapi {
  constructor(opts = {}) {
    this.dir = opts.dir || process.cwd();
    const appConfig = loadConfiguration(this.dir, opts);
    this.container = createContainer(this);
    this.container.register('config', createConfigProvider(appConfig));
    this.container.register('content-types', contentTypesRegistry(this));
    this.container.register('services', servicesRegistry(this));
    this.container.register('policies', policiesRegistry(this));
    this.container.register('middlewares', middlewaresRegistry(this));
    this.container.register('controllers', controllersRegistry(this));
    this.container.register('modules', modulesRegistry(this));
    this.container.register('plugins', pluginsRegistry(this));

    this.isLoaded = false;
    this.reload = this.reload();
    this.app = new Koa();
    this.router = new Router();
    this.server = createHTTPServer(this, this.app);
    this.fs = createStrapiFs(this);
    this.eventHub = createEventHub();
    this.startupLogger = createStartupLogger(this);
    this.app.proxy = this.config.get('server.proxy');
    this.log = createLogger(this.config.get('logger', {}));

    createUpdateNotifier(this).notify();
  }

  get config() {
    return this.container.get('config');
  }

  get EE() {
    return ee({ dir: this.dir, logger: this.log });
  }

  service(uid) {
    return this.container.get('services').get(uid);
  }

  controller(uid) {
    return this.container.get('controllers').get(uid);
  }

  contentType(name) {
    return this.container.get('content-types').get(name);
  }

  get contentTypes() {
    return this.container.get('content-types').getAll();
  }

  policy(name) {
    return this.container.get('policies').get(name);
  }

  middleware(name) {
    return this.container.get('middlewares').get(name);
  }

  plugin(name) {
    return this.container.get('plugins').get(name);
  }

  get plugins() {
    return this.container.get('plugins').getAll();
  }

  async start() {
    try {
      if (!this.isLoaded) {
        await this.load();
      }

      this.app.use(this.router.routes()).use(this.router.allowedMethods());

      // Launch server.
      await this.listen();

      return this;
    } catch (error) {
      return this.stopWithError(error);
    }
  }

  async destroy() {
    await this.server.destroy();

    await Promise.all(
      Object.values(this.plugins).map(plugin => {
        if (_.has(plugin, 'destroy') && typeof plugin.destroy === 'function') {
          return plugin.destroy();
        }
      })
    );

    if (_.has(this, 'admin')) {
      await this.admin.destroy();
    }

    this.eventHub.removeAllListeners();

    if (_.has(this, 'db')) {
      await this.db.destroy();
    }

    this.telemetry.destroy();

    delete global.strapi;
  }

  sendStartupTelemetry() {
    // Get database clients
    const databaseClients = _.map(this.config.get('connections'), _.property('settings.client'));

    // Emit started event.
    // do not await to avoid slower startup
    this.telemetry.send('didStartServer', {
      database: databaseClients,
      plugins: this.config.installedPlugins,
      providers: this.config.installedProviders,
    });
  }

  async openAdmin({ isInitialized }) {
    const shouldOpenAdmin =
      this.config.get('environment') === 'development' &&
      this.config.get('server.admin.autoOpen', true) !== false;

    if (shouldOpenAdmin || !isInitialized) {
      await utils.openBrowser(this.config);
    }
  }

  async postListen() {
    const isInitialized = await utils.isInitialized(this);

    this.startupLogger.logStartupMessage({ isInitialized });

    this.sendStartupTelemetry();
    this.openAdmin({ isInitialized });
  }

  /**
   * Add behaviors to the server
   */
  async listen() {
    return new Promise((resolve, reject) => {
      const onListen = async error => {
        if (error) {
          return reject(error);
        }

        try {
          await this.postListen();

          resolve();
        } catch (error) {
          reject(error);
        }
      };

      const listenSocket = this.config.get('server.socket');

      if (listenSocket) {
        return this.server.listen(listenSocket, onListen);
      }

      const { host, port } = this.config.get('server');
      return this.server.listen(port, host, onListen);
    });
  }

  stopWithError(err, customMessage) {
    this.log.debug(`⛔️ Server wasn't able to start properly.`);
    if (customMessage) {
      this.log.error(customMessage);
    }

    this.log.error(err);
    return this.stop();
  }

  stop(exitCode = 1) {
    this.server.destroy();

    if (this.config.get('autoReload')) {
      process.send('stop');
    }

    // Kill process
    process.exit(exitCode);
  }

  async loadAdmin() {
    await loaders.loadAdmin(this);
  }

  async loadPlugins() {
    await loaders.loadPlugins(this);
  }

  async loadPolicies() {
    await loaders.loadPolicies(this);
  }

  async loadAPIs() {
    this.api = await loaders.loadAPIs(this);
  }

  async loadComponents() {
    this.components = await loaders.loadComponents(this);
  }

  async loadMiddlewares() {
    this.middleware = await loaders.loadMiddlewares(this);
  }

  async load() {
    this.app.use(async (ctx, next) => {
      if (ctx.request.url === '/_health' && ['HEAD', 'GET'].includes(ctx.request.method)) {
        ctx.set('strapi', 'You are so French!');
        ctx.status = 204;
      } else {
        await next();
      }
    });

    await Promise.all([
      this.loadPlugins(),
      this.loadAdmin(),
      this.loadAPIs(),
      this.loadComponents(),
      this.loadMiddlewares(),
      this.loadPolicies(),
    ]);

    await bootstrap(this);

    // init webhook runner
    this.webhookRunner = createWebhookRunner({
      eventHub: this.eventHub,
      logger: this.log,
      configuration: this.config.get('server.webhooks', {}),
    });

    await this.runLifecyclesFunctions(LIFECYCLES.REGISTER);

    const contentTypes = [
      coreStoreModel,
      webhookModel,
      ...Object.values(strapi.contentTypes),
      ...Object.values(strapi.components),
    ];

    this.db = await Database.init({
      ...this.config.get('database'),
      models: Database.transformContentTypes(contentTypes),
    });

    await this.db.schema.sync();

    this.store = createCoreStore({
      environment: this.config.get('environment'),
      db: this.db,
    });

    this.webhookStore = createWebhookStore({ db: this.db });

    await this.startWebhooks();

    this.entityValidator = entityValidator;

    this.entityService = createEntityService({
      strapi: this,
      db: this.db,
      eventHub: this.eventHub,
      entityValidator: this.entityValidator,
    });

    this.telemetry = createTelemetry(this);

    // Initialize middlewares.
    await initializeMiddlewares.call(this);

    await this.runLifecyclesFunctions(LIFECYCLES.BOOTSTRAP);

    this.isLoaded = true;
    return this;
  }

  async startWebhooks() {
    const webhooks = await this.webhookStore.findWebhooks();
    webhooks.forEach(webhook => this.webhookRunner.add(webhook));
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

      if (this.config.get('autoReload')) {
        this.server.destroy();
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

  async runLifecyclesFunctions(lifecycleName) {
    const execLifecycle = async fn => {
      if (!fn) {
        return;
      }

      return fn();
    };

    const configPath = `functions.${lifecycleName}`;

    // plugins
    await this.container.get('modules')[lifecycleName]();

    // user
    await execLifecycle(this.config.get(configPath));

    // admin
    await this.admin[lifecycleName]();
  }

  getModel(uid) {
    return this.contentTypes[uid] || this.components[uid];
  }

  /**
   * Binds queries with a specific model
   * @param {string} uid
   * @returns {}
   */
  query(uid) {
    return this.db.query(uid);
  }
}

module.exports = options => {
  const strapi = new Strapi(options);
  global.strapi = strapi;
  return strapi;
};

module.exports.Strapi = Strapi;
