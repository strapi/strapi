/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable vars-on-top */
/* eslint-disable no-var */
import path from 'path';
import _ from 'lodash';
import { isFunction } from 'lodash/fp';
import { Logger, createLogger } from '@strapi/logger';
import { Database } from '@strapi/database';
import { hooks } from '@strapi/utils';
import type {
  Strapi as StrapiI,
  Server,
  EntityService,
  Documents,
  EventHub,
  StartupLogger,
  CronService,
  WebhookStore,
  CoreStore,
  TelemetryService,
  RequestContext,
  CustomFields,
  Fetch,
  StrapiFS,
  StrapiDirectories,
  Reloader,
  EntityValidator,
  Common,
  Shared,
  Schema,
} from '@strapi/types';

import loadConfiguration from './core/app-configuration';

import * as factories from './factories';
import compile from './compile';

import * as utils from './utils';
import * as registries from './core/registries';
import * as loaders from './core/loaders';
import { Container } from './container';
import createStrapiFs from './services/fs';
import createEventHub from './services/event-hub';
import { createServer } from './services/server';
import createWebhookRunner, { WebhookRunner } from './services/webhook-runner';
import { webhookModel, createWebhookStore } from './services/webhook-store';
import { createCoreStore, coreStoreModel } from './services/core-store';
import createEntityService from './services/entity-service';

import createCronService from './services/cron';
import entityValidator from './services/entity-validator';
import createTelemetry from './services/metrics';
import requestContext from './services/request-context';
import createAuth from './services/auth';
import createCustomFields from './services/custom-fields';
import createContentAPI from './services/content-api';
import createUpdateNotifier from './utils/update-notifier';
import createStartupLogger from './utils/startup-logger';
import { createStrapiFetch } from './utils/fetch';
import { LIFECYCLES } from './utils/lifecycles';
import ee from './utils/ee';
import bootstrap from './core/bootstrap';
import { destroyOnSignal } from './utils/signals';
import getNumberOfDynamicZones from './services/utils/dynamic-zones';
import convertCustomFieldType from './utils/convert-custom-field-type';
import { transformContentTypesToModels } from './utils/transform-content-types-to-models';
import { createDocumentRepository } from './services/document-service/document-repository';

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
const resolveWorkingDirectories = (opts: { appDir?: string; distDir?: string }) => {
  const cwd = process.cwd();

  const appDir = opts.appDir ? path.resolve(cwd, opts.appDir) : cwd;
  const distDir = opts.distDir ? path.resolve(cwd, opts.distDir) : appDir;

  return { app: appDir, dist: distDir };
};

const reloader = (strapi: Strapi) => {
  const state = {
    shouldReload: 0,
    isWatching: true,
  };

  function reload() {
    if (state.shouldReload > 0) {
      // Reset the reloading state
      state.shouldReload -= 1;
      reload.isReloading = false;
      return;
    }

    if (strapi.config.get('autoReload')) {
      process.send?.('reload');
    }
  }

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
};

export type LoadedStrapi = Required<Strapi>;

class Strapi extends Container implements StrapiI {
  server: Server;

  log: Logger;

  fs: StrapiFS;

  eventHub: EventHub;

  startupLogger: StartupLogger;

  cron: CronService;

  webhookRunner?: WebhookRunner;

  webhookStore?: WebhookStore;

  store?: CoreStore;

  entityValidator?: EntityValidator;

  entityService?: EntityService.EntityService;

  documents?: Documents.Repository;

  telemetry: TelemetryService;

  requestContext: RequestContext;

  customFields: CustomFields.CustomFields;

  fetch: Fetch;

  dirs: StrapiDirectories;

  admin?: Common.Module;

  isLoaded: boolean;

  db?: Database;

  app: any;

  EE?: boolean;

  reload: Reloader;

  constructor(opts: StrapiOptions = {}) {
    super();

    destroyOnSignal(this);

    const rootDirs = resolveWorkingDirectories(opts);

    // Load the app configuration from the dist directory
    const appConfig = loadConfiguration(rootDirs, opts);

    // Instantiate the Strapi container
    this.add('config', registries.config(appConfig))
      .add('content-types', registries.contentTypes())
      .add('components', registries.components())
      .add('services', registries.services(this))
      .add('policies', registries.policies())
      .add('middlewares', registries.middlewares())
      .add('hooks', registries.hooks())
      .add('controllers', registries.controllers(this))
      .add('modules', registries.modules(this))
      .add('plugins', registries.plugins(this))
      .add('custom-fields', registries.customFields(this))
      .add('apis', registries.apis(this))
      .add('sanitizers', registries.sanitizers())
      .add('validators', registries.validators())
      .add('content-api', createContentAPI(this))
      .add('auth', createAuth());

    // Create a mapping of every useful directory (for the app, dist and static directories)
    this.dirs = utils.getDirs(rootDirs, { strapi: this });

    // Strapi state management variables
    this.isLoaded = false;
    this.reload = reloader(this);

    // Instantiate the Koa app & the HTTP server
    this.server = createServer(this);

    // Strapi utils instantiation
    this.fs = createStrapiFs(this);
    this.eventHub = createEventHub();
    this.startupLogger = createStartupLogger(this);
    this.log = createLogger(this.config.get('logger', { level: 'info' }));
    this.cron = createCronService();
    this.telemetry = createTelemetry(this);
    this.requestContext = requestContext;
    this.customFields = createCustomFields(this);
    this.fetch = createStrapiFetch(this);

    createUpdateNotifier(this).notify();

    Object.defineProperty<Strapi>(this, 'EE', {
      get: () => {
        ee.init(this.dirs.app.root, this.log);
        return ee.isEE;
      },
      configurable: false,
    });

    Object.defineProperty<Strapi>(this, 'ee', {
      get: () => ee,
      configurable: false,
    });
  }

  get config() {
    return this.get('config');
  }

  get services() {
    return this.get('services').getAll();
  }

  service(uid: Common.UID.Service) {
    return this.get('services').get(uid);
  }

  get controllers() {
    return this.get('controllers').getAll();
  }

  controller(uid: Common.UID.Controller) {
    return this.get('controllers').get(uid);
  }

  get contentTypes(): Shared.ContentTypes {
    return this.get('content-types').getAll();
  }

  contentType(name: Common.UID.ContentType) {
    return this.get('content-types').get(name);
  }

  get components(): Shared.Components {
    return this.get('components').getAll();
  }

  get policies() {
    return this.get('policies').getAll();
  }

  policy(name: string) {
    return this.get('policies').get(name);
  }

  get middlewares() {
    return this.get('middlewares').getAll();
  }

  middleware(name: string) {
    return this.get('middlewares').get(name);
  }

  get plugins(): Record<string, Common.Plugin> {
    return this.get('plugins').getAll();
  }

  plugin(name: string): Common.Plugin {
    return this.get('plugins').get(name);
  }

  get hooks() {
    return this.get('hooks').getAll();
  }

  hook(name: string) {
    return this.get('hooks').get(name);
  }

  // api(name) {
  //   return this.get('apis').get(name);
  // }

  get api(): Record<string, Common.Module> {
    return this.get('apis').getAll();
  }

  get auth() {
    return this.get('auth');
  }

  get contentAPI() {
    return this.get('content-api');
  }

  get sanitizers() {
    return this.get('sanitizers');
  }

  get validators() {
    return this.get('validators');
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

    this.eventHub.destroy();

    await this.db?.destroy();

    this.telemetry.destroy();
    this.cron.destroy();

    process.removeAllListeners();

    // @ts-expect-error: Allow clean delete of global.strapi to allow re-instanciation
    delete global.strapi;
  }

  sendStartupTelemetry() {
    // Emit started event.
    // do not await to avoid slower startup
    // This event is anonymous
    this.telemetry.send('didStartServer', {
      groupProperties: {
        database: this.config.get('database.connection.client'),
        plugins: Object.keys(this.plugins),
        numberOfAllContentTypes: _.size(this.contentTypes), // TODO: V5: This event should be renamed numberOfContentTypes in V5 as the name is already taken to describe the number of content types using i18n.
        numberOfComponents: _.size(this.components),
        numberOfDynamicZones: getNumberOfDynamicZones(),
        environment: this.config.environment,
        // TODO: to add back
        // providers: this.config.installedProviders,
      },
    });
  }

  async openAdmin({ isInitialized }: { isInitialized: boolean }) {
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
    return new Promise<void>((resolve, reject) => {
      const onListen = async () => {
        try {
          await this.postListen();

          resolve();
        } catch (error) {
          reject(error);
        }
      };

      const listenSocket = this.config.get('server.socket');

      if (listenSocket) {
        this.server.listen(listenSocket, onListen);
      } else {
        const { host, port } = this.config.get('server');

        this.server.listen(port, host, onListen);
      }
    });
  }

  stopWithError(err: unknown, customMessage?: string): never {
    this.log.debug(`⛔️ Server wasn't able to start properly.`);
    if (customMessage) {
      this.log.error(customMessage);
    }

    this.log.error(err);
    return this.stop();
  }

  stop(exitCode = 1): never {
    this.destroy();

    if (this.config.get('autoReload')) {
      process.send?.('stop');
    }

    // Kill process
    process.exit(exitCode);
  }

  registerInternalHooks() {
    this.get('hooks').set('strapi::content-types.beforeSync', hooks.createAsyncParallelHook());
    this.get('hooks').set('strapi::content-types.afterSync', hooks.createAsyncParallelHook());
  }

  async register() {
    await loaders.loadApplicationContext(this);

    await bootstrap({ strapi: this });

    // init webhook runner
    this.webhookRunner = createWebhookRunner({
      eventHub: this.eventHub,
      logger: this.log,
      configuration: this.config.get('server.webhooks', {}),
      fetch: this.fetch,
    });

    this.registerInternalHooks();

    this.telemetry.register();

    await this.runLifecyclesFunctions(LIFECYCLES.REGISTER);
    // NOTE: Swap type customField for underlying data type
    convertCustomFieldType(this);

    return this;
  }

  async bootstrap() {
    const contentTypes = [
      coreStoreModel,
      webhookModel,
      ...Object.values(this.contentTypes),
      ...Object.values(this.components),
    ];

    this.db = await Database.init({
      ...this.config.get('database'),
      models: transformContentTypesToModels(contentTypes),
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

    this.documents = createDocumentRepository(this);

    if (this.config.get('server.cron.enabled', true)) {
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
      contentTypes: this.contentTypes,
    });

    await this.db.schema.sync();

    if (this.EE) {
      await ee.checkLicense({ strapi: this });
    }

    await this.hook('strapi::content-types.afterSync').call({
      oldContentTypes,
      contentTypes: this.contentTypes,
    });

    await this.store.set({
      type: 'strapi',
      name: 'content_types',
      key: 'schema',
      value: this.contentTypes,
    });

    await this.startWebhooks();

    await this.server.initMiddlewares();
    this.server.initRouting();

    await this.contentAPI.permissions.registerActions();

    await this.runLifecyclesFunctions(LIFECYCLES.BOOTSTRAP);

    this.cron.start();

    return this;
  }

  async load() {
    await this.register();
    await this.bootstrap();

    this.isLoaded = true;

    return this as this & Required<StrapiI>;
  }

  async startWebhooks() {
    const webhooks = await this.webhookStore?.findWebhooks();
    if (!webhooks) {
      return;
    }

    for (const webhook of webhooks) {
      this.webhookRunner?.add(webhook);
    }
  }

  async runLifecyclesFunctions(lifecycleName: 'register' | 'bootstrap' | 'destroy') {
    // plugins
    await this.get('modules')[lifecycleName]();

    // admin
    const adminLifecycleFunction = this.admin && this.admin[lifecycleName];
    if (isFunction(adminLifecycleFunction)) {
      await adminLifecycleFunction({ strapi: this });
    }

    // user
    const userLifecycleFunction = this.app && this.app[lifecycleName];
    if (isFunction(userLifecycleFunction)) {
      await userLifecycleFunction({ strapi: this });
    }
  }

  getModel(uid: Common.UID.ContentType): Schema.ContentType;
  getModel(uid: Common.UID.Component): Schema.Component;
  getModel<TUID extends Common.UID.Schema>(
    uid: TUID
  ): Schema.ContentType | Schema.Component | undefined {
    if (uid in this.contentTypes) {
      return this.contentTypes[uid as Common.UID.ContentType];
    }

    if (uid in this.components) {
      return this.components[uid as Common.UID.Component];
    }
  }

  /**
   * Binds queries with a specific model
   * @param {string} uid
   */
  query(uid: Common.UID.Schema) {
    return this.db!.query(uid);
  }
}

interface StrapiOptions {
  appDir?: string;
  distDir?: string;
  autoReload?: boolean;
  serveAdminPanel?: boolean;
}

interface Init {
  (options?: StrapiOptions): StrapiI;
  factories: typeof factories;
  compile: typeof compile;
}

const initFn = (options: StrapiOptions = {}): StrapiI => {
  const strapi = new Strapi(options);
  global.strapi = strapi as LoadedStrapi;
  return strapi;
};

const init: Init = Object.assign(initFn, { factories, compile });

export default init;
