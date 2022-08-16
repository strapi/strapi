'use strict';

const path = require('path');
const _ = require('lodash');
const { isFunction } = require('lodash/fp');
const { createLogger } = require('@strapi/logger');
const { Database } = require('@strapi/database');
const { createAsyncParallelHook } = require('@strapi/utils').hooks;

const loadConfiguration = require('./core/app-configuration');

const { createContainer } = require('./container');
const utils = require('./utils');
const createStrapiFs = require('./services/fs');
const createEventHub = require('./services/event-hub');
const { createServer } = require('./services/server');
const createWebhookRunner = require('./services/webhook-runner');
const { webhookModel, createWebhookStore } = require('./services/webhook-store');
const { createCoreStore, coreStoreModel } = require('./services/core-store');
const createEntityService = require('./services/entity-service');
const createCronService = require('./services/cron');
const entityValidator = require('./services/entity-validator');
const createTelemetry = require('./services/metrics');
const createAuth = require('./services/auth');
const createContentAPI = require('./services/content-api');
const createUpdateNotifier = require('./utils/update-notifier');
const createStartupLogger = require('./utils/startup-logger');
const { LIFECYCLES } = require('./utils/lifecycles');
const ee = require('./utils/ee');
const contentTypesRegistry = require('./core/registries/content-types');
const servicesRegistry = require('./core/registries/services');
const policiesRegistry = require('./core/registries/policies');
const middlewaresRegistry = require('./core/registries/middlewares');
const hooksRegistry = require('./core/registries/hooks');
const controllersRegistry = require('./core/registries/controllers');
const modulesRegistry = require('./core/registries/modules');
const pluginsRegistry = require('./core/registries/plugins');
const createConfigProvider = require('./core/registries/config');
const apisRegistry = require('./core/registries/apis');
const bootstrap = require('./core/bootstrap');
const loaders = require('./core/loaders');
const { destroyOnSignal } = require('./utils/signals');
const sanitizersRegistry = require('./core/registries/sanitizers');

// TODO: move somewhere else
const draftAndPublishSync = require('./migrations/draft-publish');

/**
 * Resolve the working directories based on the instance options.
 *
 * Behavior:
 * - `appDir` is the directory where Strapi will write every file (schemas, generated APIs, controllers or services)
 * - `distDir` is the directory where Strapi will read configurations, schemas and any compiled code
 *
 * Default values:
 * - If `appDir` is `undefined`, it'll be set to `process.cwd()`
 * - If `distDir` is `undefined`, it'll be set to `appDir`
 */
const resolveWorkingDirectories = opts => {
  const cwd = process.cwd();

  const appDir = opts.appDir ? path.resolve(cwd, opts.appDir) : cwd;
  const distDir = opts.distDir ? path.resolve(cwd, opts.distDir) : appDir;

  return { app: appDir, dist: distDir };
};

/** @implements {import('@strapi/strapi').Strapi} */
class Strapi {
  constructor(opts = {}) {
    destroyOnSignal(this);

    const rootDirs = resolveWorkingDirectories(opts);

    // Load the app configuration from the dist directory
    const appConfig = loadConfiguration({ appDir: rootDirs.app, distDir: rootDirs.dist }, opts);

    // Instanciate the Strapi container
    this.container = createContainer(this);

    // Register every Strapi registry in the container
    this.container.register('config', createConfigProvider(appConfig));
    this.container.register('content-types', contentTypesRegistry(this));
    this.container.register('services', servicesRegistry(this));
    this.container.register('policies', policiesRegistry(this));
    this.container.register('middlewares', middlewaresRegistry(this));
    this.container.register('hooks', hooksRegistry(this));
    this.container.register('controllers', controllersRegistry(this));
    this.container.register('modules', modulesRegistry(this));
    this.container.register('plugins', pluginsRegistry(this));
    this.container.register('apis', apisRegistry(this));
    this.container.register('auth', createAuth(this));
    this.container.register('content-api', createContentAPI(this));
    this.container.register('sanitizers', sanitizersRegistry(this));

    // Create a mapping of every useful directory (for the app, dist and static directories)
    this.dirs = utils.getDirs(rootDirs, { strapi: this });

    // Strapi state management variables
    this.isLoaded = false;
    this.reload = this.reload();

    // Instanciate the Koa app & the HTTP server
    this.server = createServer(this);

    // Strapi utils instanciation
    this.fs = createStrapiFs(this);
    this.eventHub = createEventHub();
    this.startupLogger = createStartupLogger(this);
    this.log = createLogger(this.config.get('logger', {}));
    this.cron = createCronService();
    this.telemetry = createTelemetry(this);

    createUpdateNotifier(this).notify();
  }

  get config() {
    return this.container.get('config');
  }

  get EE() {
    return ee({ dir: this.dirs.dist.root, logger: this.log });
  }

  get services() {
    return this.container.get('services').getAll();
  }

  service(uid) {
    return this.container.get('services').get(uid);
  }

  get controllers() {
    return this.container.get('controllers').getAll();
  }

  controller(uid) {
    return this.container.get('controllers').get(uid);
  }

  get contentTypes() {
    return this.container.get('content-types').getAll();
  }

  contentType(name) {
    return this.container.get('content-types').get(name);
  }

  get policies() {
    return this.container.get('policies').getAll();
  }

  policy(name) {
    return this.container.get('policies').get(name);
  }

  get middlewares() {
    return this.container.get('middlewares').getAll();
  }

  middleware(name) {
    return this.container.get('middlewares').get(name);
  }

  get plugins() {
    return this.container.get('plugins').getAll();
  }

  plugin(name) {
    return this.container.get('plugins').get(name);
  }

  get hooks() {
    return this.container.get('hooks').getAll();
  }

  hook(name) {
    return this.container.get('hooks').get(name);
  }

  // api(name) {
  //   return this.container.get('apis').get(name);
  // }

  get api() {
    return this.container.get('apis').getAll();
  }

  get auth() {
    return this.container.get('auth');
  }

  get contentAPI() {
    return this.container.get('content-api');
  }

  get sanitizers() {
    return this.container.get('sanitizers');
  }

  async start() {
    try {
      if (!this.isLoaded) {
        await this.load();
      }

      await this.listen();

      return this;
    } catch (error) {
      return this.stopWithError(error);
    }
  }

  async destroy() {
    await this.server.destroy();

    await this.runLifecyclesFunctions(LIFECYCLES.DESTROY);

    this.eventHub.removeAllListeners();

    if (_.has(this, 'db')) {
      await this.db.destroy();
    }

    this.telemetry.destroy();
    this.cron.destroy();

    process.removeAllListeners();

    delete global.strapi;
  }

  sendStartupTelemetry() {
    // Emit started event.
    // do not await to avoid slower startup
    this.telemetry.send('didStartServer', {
      database: strapi.config.get('database.connection.client'),
      plugins: Object.keys(strapi.plugins),
      // TODO: to add back
      // providers: this.config.installedProviders,
    });
  }

  async openAdmin({ isInitialized }) {
    const shouldOpenAdmin =
      this.config.get('environment') === 'development' &&
      this.config.get('admin.autoOpen', true) !== false;

    if (shouldOpenAdmin && !isInitialized) {
      try {
        await utils.openBrowser(this.config);
        this.telemetry.send('didOpenTab');
      } catch (e) {
        this.telemetry.send('didNotOpenTab');
      }
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
    this.destroy();

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
    await loaders.loadAPIs(this);
  }

  async loadComponents() {
    this.components = await loaders.loadComponents(this);
  }

  async loadMiddlewares() {
    await loaders.loadMiddlewares(this);
  }

  async loadApp() {
    this.app = await loaders.loadSrcIndex(this);
  }

  async loadSanitizers() {
    await loaders.loadSanitizers(this);
  }

  registerInternalHooks() {
    this.container.get('hooks').set('strapi::content-types.beforeSync', createAsyncParallelHook());
    this.container.get('hooks').set('strapi::content-types.afterSync', createAsyncParallelHook());

    this.hook('strapi::content-types.beforeSync').register(draftAndPublishSync.disable);
    this.hook('strapi::content-types.afterSync').register(draftAndPublishSync.enable);
  }

  async register() {
    await Promise.all([
      this.loadApp(),
      this.loadSanitizers(),
      this.loadPlugins(),
      this.loadAdmin(),
      this.loadAPIs(),
      this.loadComponents(),
      this.loadMiddlewares(),
      this.loadPolicies(),
    ]);

    await bootstrap({ strapi: this });

    // init webhook runner
    this.webhookRunner = createWebhookRunner({
      eventHub: this.eventHub,
      logger: this.log,
      configuration: this.config.get('server.webhooks', {}),
    });

    this.registerInternalHooks();

    this.telemetry.register();

    await this.runLifecyclesFunctions(LIFECYCLES.REGISTER);

    return this;
  }

  async bootstrap() {
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

    this.store = createCoreStore({ db: this.db });
    this.webhookStore = createWebhookStore({ db: this.db });

    this.entityValidator = entityValidator;
    this.entityService = createEntityService({
      strapi: this,
      db: this.db,
      eventHub: this.eventHub,
      entityValidator: this.entityValidator,
    });

    if (strapi.config.get('server.cron.enabled', true)) {
      const cronTasks = this.config.get('server.cron.tasks', {});
      this.cron.add(cronTasks);
    }

    this.telemetry.bootstrap();

    let oldContentTypes;
    if (await this.db.getSchemaConnection().hasTable(coreStoreModel.collectionName)) {
      oldContentTypes = await this.store.get({
        type: 'strapi',
        name: 'content_types',
        key: 'schema',
      });
    }

    await this.hook('strapi::content-types.beforeSync').call({
      oldContentTypes,
      contentTypes: strapi.contentTypes,
    });

    await this.db.schema.sync();

    await this.hook('strapi::content-types.afterSync').call({
      oldContentTypes,
      contentTypes: strapi.contentTypes,
    });

    await this.store.set({
      type: 'strapi',
      name: 'content_types',
      key: 'schema',
      value: strapi.contentTypes,
    });

    await this.startWebhooks();

    await this.server.initMiddlewares();
    await this.server.initRouting();

    await this.runLifecyclesFunctions(LIFECYCLES.BOOTSTRAP);

    this.cron.start();

    await this.contentAPI.permissions.syncActions();

    return this;
  }

  async load() {
    await this.register();
    await this.bootstrap();

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
        process.send('reload');
      }
    };

    Object.defineProperty(reload, 'isWatching', {
      configurable: true,
      enumerable: true,
      set(value) {
        // Special state when the reloader is disabled temporarly (see GraphQL plugin example).
        if (state.isWatching === false && value === true) {
          state.shouldReload += 1;
        }
        state.isWatching = value;
      },
      get() {
        return state.isWatching;
      },
    });

    reload.isReloading = false;
    reload.isWatching = true;

    return reload;
  }

  async runLifecyclesFunctions(lifecycleName) {
    // plugins
    await this.container.get('modules')[lifecycleName]();

    // user
    const userLifecycleFunction = this.app && this.app[lifecycleName];
    if (isFunction(userLifecycleFunction)) {
      await userLifecycleFunction({ strapi: this });
    }

    // admin
    const adminLifecycleFunction = this.admin && this.admin[lifecycleName];
    if (isFunction(adminLifecycleFunction)) {
      await adminLifecycleFunction({ strapi: this });
    }
  }

  getModel(uid) {
    return this.contentTypes[uid] || this.components[uid];
  }

  /**
   * Binds queries with a specific model
   * @param {string} uid
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
