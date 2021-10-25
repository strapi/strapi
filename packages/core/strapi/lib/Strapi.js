'use strict';

/**
 * @typedef {import('@hapi/boom')} Boom
 * @typedef {import('@strapi/admin').Server} StrapiAdminServer
 * @typedef {import('@strapi/strapi').StrapiContentTypes} StrapiContentTypes
 * @typedef {import('@strapi/strapi').StrapiComponents} StrapiComponents
 * @typedef {import('@strapi/strapi').StrapiServices} StrapiServices
 * @typedef {import('@strapi/strapi').StrapiControllers} StrapiControllers
 * @typedef {import('@strapi/strapi').StrapiPolicies} StrapiPolicies
 * @typedef {import('@strapi/strapi').StrapiMiddlewares} StrapiMiddlewares
 * @typedef {import('@strapi/strapi').StrapiPlugins} StrapiPlugins
 * @typedef {import('@strapi/strapi').StrapiHooks} StrapiHooks
 * @typedef {import('@strapi/strapi').StrapiApi} StrapiApi
 * @typedef {import('@strapi/database').EntityManager} EntityManager
 */

/**
 * @typedef {StrapiContentTypes & StrapiComponents} StrapiModels
 */

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
const createAuthentication = require('./services/auth');
const createUpdateNotifier = require('./utils/update-notifier');
const createStartupLogger = require('./utils/startup-logger');
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

// TODO: move somewhere else
const draftAndPublishSync = require('./migrations/draft-publish');

const LIFECYCLES = {
  /**
   * @type {'register'}
   */
  REGISTER: 'register',
  /**
   * @type {'bootstrap'}
   */
  BOOTSTRAP: 'bootstrap',
  /**
   * @type {'destroy'}
   */
  DESTROY: 'destroy',
};

class Strapi {
  /**
   * @param {{
   *  dir?: string
   *  autoReload?: boolean
   *  serveAdminPanel?: boolean
   * }} opts
   */
  constructor(opts = {}) {
    destroyOnSignal(this);
    this.dirs = utils.getDirs(opts.dir || process.cwd());
    const appConfig = loadConfiguration(this.dirs.root, opts);
    this.container = createContainer(this);
    this.container.register('config', createConfigProvider(appConfig));
    this.container.register('content-types', contentTypesRegistry());
    this.container.register('services', servicesRegistry(this));
    this.container.register('policies', policiesRegistry());
    this.container.register('middlewares', middlewaresRegistry());
    this.container.register('hooks', hooksRegistry());
    this.container.register('controllers', controllersRegistry());
    this.container.register('modules', modulesRegistry(this));
    this.container.register('plugins', pluginsRegistry(this));
    this.container.register('apis', apisRegistry(this));
    this.container.register('auth', createAuthentication());

    this.isLoaded = false;
    // this.reload = this.reload();
    this.server = createServer(this);

    this.fs = createStrapiFs(this);
    this.eventHub = createEventHub();
    this.startupLogger = createStartupLogger(this);
    this.log = createLogger(this.config.get('logger', {}));
    this.cron = createCronService();
    this.telemetry = createTelemetry(this);

    /**
     * @type {Boom}
     */
    // @ts-ignore
    this.errors = undefined;

    /**
     * @type {Record<string, any>}
     */
    // @ts-ignore
    this.components = undefined;

    /**
     * @type {StrapiAdminServer}
     */
    // @ts-ignore
    this.admin = undefined;

    /**
     * @type {Database}
     */
    // @ts-ignore
    this.db = undefined;

    /**
     * @type {EntityManager}
     */
    // @ts-ignore
    this.entityService = undefined;

    createUpdateNotifier(this).notify();
  }

  get config() {
    return this.container.get('config');
  }

  get EE() {
    return ee({ dir: this.dirs.root, logger: this.log });
  }

  get services() {
    return this.container.get('services').getAll();
  }

  /**
   * @template {keyof StrapiServices} T
   * @param {T} uid
   */
  service(uid) {
    return this.container.get('services').get(uid);
  }

  get controllers() {
    return this.container.get('controllers').getAll();
  }

  /**
   * @template {keyof StrapiControllers} T
   * @param {T} uid
   * @returns {StrapiControllers[T]}
   */
  controller(uid) {
    return this.container.get('controllers').get(uid);
  }

  get contentTypes() {
    return this.container.get('content-types').getAll();
  }

  /**
   * @template {keyof StrapiContentTypes} T
   * @param {T} name
   */
  contentType(name) {
    return this.container.get('content-types').get(name);
  }

  get policies() {
    return this.container.get('policies').getAll();
  }

  /**
   * @template {keyof StrapiPolicies} T
   * @param {T} name
   * @returns {StrapiPolicies[T]}
   */
  policy(name) {
    return this.container.get('policies').get(name);
  }

  get middlewares() {
    return this.container.get('middlewares').getAll();
  }

  /**
   * @template {keyof StrapiMiddlewares} T
   * @param {T} name
   * @returns {StrapiMiddlewares[T]}
   */
  middleware(name) {
    return this.container.get('middlewares').get(name);
  }

  get plugins() {
    return this.container.get('plugins').getAll();
  }

  /**
   * @template {keyof StrapiPlugins} T
   * @param {T} name
   * @returns {StrapiPlugins[T]}
   */
  plugin(name) {
    return this.container.get('plugins').get(name);
  }

  get hooks() {
    return this.container.get('hooks').getAll();
  }

  /**
   * @template {keyof StrapiHooks} T
   * @param {T} name
   * @returns {StrapiHooks[T]}
   */
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

  async start() {
    try {
      if (!this.isLoaded) {
        await this.load();
      }

      await this.listen();

      return this;
    } catch (/** @type {any} **/ error) {
      this.stopWithError(error);
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

    // @ts-ignore
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

  /**
   * @param {{ isInitialized?: boolean }} ctx
   */
  async openAdmin({ isInitialized }) {
    const shouldOpenAdmin =
      this.config.get('environment') === 'development' &&
      this.config.get('server.admin.autoOpen', true) !== false;

    if (shouldOpenAdmin && !isInitialized) {
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
   *
   * @returns {Promise<void>}
   */
  async listen() {
    return new Promise((resolve, reject) => {
      /**
       * @param {Error=} error
       */
      const onListen = async error => {
        if (error) {
          return reject(error);
        }

        try {
          await this.postListen();

          resolve();
        } catch (/** @type {any} **/ error) {
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

  /**
   * @param {Error=} err
   * @param {string=} customMessage
   * @returns {never}
   */
  stopWithError(err, customMessage) {
    this.log.debug(`⛔️ Server wasn't able to start properly.`);
    if (customMessage) {
      this.log.error(customMessage);
    }

    this.log.error(err);
    return this.stop();
  }

  /**
   * @param {number=} exitCode
   * @returns {never}
   */
  stop(exitCode = 1) {
    this.destroy();

    // From nodejs: process.send is available only when an IPC channel
    // has been established between the parent and child
    // (i.e. when using child_process.fork())
    if (this.config.get('autoReload') && typeof process.send === 'function') {
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
    const components = await loaders.loadComponents(this);

    Object.defineProperty(this, 'components', {
      get() {
        return components;
      },
      configurable: true,
      enumerable: true,
    });
  }

  async loadMiddlewares() {
    await loaders.loadMiddlewares(this);
  }

  async loadApp() {
    this.app = loaders.loadSrcIndex(this);
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
      this.loadPlugins(),
      this.loadAdmin(),
      this.loadAPIs(),
      this.loadComponents(),
      this.loadMiddlewares(),
      this.loadPolicies(),
    ]);

    bootstrap({ strapi: this });

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
      ...Object.values(strapi.components || []),
    ];

    this.db = await Database.init({
      ...this.config.get('database'),
      models: Database.transformContentTypes(contentTypes),
    });

    this.store = createCoreStore({ db: this.db });
    this.webhookStore = createWebhookStore({ db: this.db });

    this.entityValidator = entityValidator;

    const entityService = createEntityService({
      strapi: this,
      db: this.db,
      eventHub: this.eventHub,
      entityValidator: this.entityValidator,
    });
    this.entityService = entityService;

    const cronTasks = this.config.get('server.cron.tasks', {});
    this.cron.add(cronTasks);

    this.telemetry.bootstrap();

    let oldContentTypes;
    if (await this.db.connection.schema.hasTable(coreStoreModel.collectionName)) {
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

    return this;
  }

  async load() {
    await this.register();
    await this.bootstrap();

    this.isLoaded = true;

    return this;
  }

  async startWebhooks() {
    if (!this.webhookStore || !this.webhookRunner) {
      throw new Error(`Unable to start webhooks. strapi.boostrap may not be called`);
    }

    const webhooks = await this.webhookStore.findWebhooks();

    for (const webhook of webhooks) {
      this.webhookRunner.add(webhook);
    }
  }

  get reload() {
    const state = {
      shouldReload: 0,
      isWatching: false,
    };

    const reload = () => {
      if (state.shouldReload > 0) {
        // Reset the reloading state
        state.shouldReload -= 1;
        reload.isReloading = false;
        return;
      }

      if (this.config.get('autoReload')) {
        // From nodejs: process.send is available only when an IPC channel
        // has been established between the parent and child
        // (i.e. when using child_process.fork())
        if (typeof process.send === 'function') {
          process.send('reload');
        }
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

  /**
   * @param {'bootstrap' | 'register' | 'destroy'} lifecycleName
   */
  async runLifecyclesFunctions(lifecycleName) {
    // plugins
    await this.container.get('modules')[lifecycleName]();

    // user
    if (this.app) {
      const userLifecycleFunction = this.app[lifecycleName];
      if (isFunction(userLifecycleFunction)) {
        await userLifecycleFunction({ strapi: this });
      }
    }

    // admin
    if (this.admin) {
      const adminLifecycleFunction = this.admin[lifecycleName];
      if (isFunction(adminLifecycleFunction)) {
        await adminLifecycleFunction({ strapi: this });
      }
    }
  }

  /**
   * @template {keyof StrapiModels} M
   * @param {M} uid
   */
  getModel(uid) {
    if (uid in this.contentTypes) {
      return this.contentTypes[uid];
    }
    if (this.components && uid in this.components) {
      return this.components[uid];
    }
  }

  /**
   * @template {keyof StrapiContentTypes} T
   * @param {T} uid
   */
  query(uid) {
    return this.db.query(uid);
  }
}

/**
 * @param {{
 *  dir?: string
 *  autoReload?: boolean
 *  serveAdminPanel?: boolean
 * }=} options
 */
module.exports = options => {
  const strapi = new Strapi(options);
  global.strapi = strapi;
  return strapi;
};

module.exports.Strapi = Strapi;
