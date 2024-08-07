import * as globalAgent from 'global-agent';
import path from 'path';
import _ from 'lodash';
import { isFunction } from 'lodash/fp';
import { Logger, createLogger } from '@strapi/logger';
import { Database } from '@strapi/database';

import type { Core, Modules, UID, Schema } from '@strapi/types';

import { loadConfiguration } from './configuration';

import * as factories from './factories';

import * as utils from './utils';
import { Container } from './container';
import createStrapiFs from './services/fs';
import createEventHub from './services/event-hub';
import { createServer } from './services/server';
import { createReloader } from './services/reloader';

import { providers } from './providers';
import createEntityService from './services/entity-service';
import createQueryParamService from './services/query-params';

import entityValidator from './services/entity-validator';
import requestContext from './services/request-context';
import createAuth from './services/auth';
import createCustomFields from './services/custom-fields';
import createContentAPI from './services/content-api';
import getNumberOfDynamicZones from './services/utils/dynamic-zones';
import { FeaturesService, createFeaturesService } from './services/features';
import { createDocumentService } from './services/document-service';

import { coreStoreModel } from './services/core-store';
import { createConfigProvider } from './services/config';

class Strapi extends Container implements Core.Strapi {
  app: any;

  isLoaded: boolean = false;

  internal_config: Record<string, unknown> = {};

  constructor(opts: StrapiOptions) {
    super();

    this.internal_config = loadConfiguration(opts);

    this.registerInternalServices();

    for (const provider of providers) {
      provider.init?.(this);
    }
  }

  get admin(): Core.Module {
    return this.get('admin');
  }

  get EE(): boolean {
    return utils.ee.isEE;
  }

  get ee(): Core.Strapi['ee'] {
    return utils.ee;
  }

  get dirs(): Core.StrapiDirectories {
    return this.config.get('dirs');
  }

  get reload(): Core.Reloader {
    return this.get('reload');
  }

  get db(): Database {
    return this.get('db');
  }

  get requestContext(): Modules.RequestContext.RequestContext {
    return this.get('requestContext');
  }

  get customFields(): Modules.CustomFields.CustomFields {
    return this.get('customFields');
  }

  get entityValidator(): Modules.EntityValidator.EntityValidator {
    return this.get('entityValidator');
  }

  /**
   * @deprecated `strapi.entityService` will be removed in the next major version
   */
  get entityService(): Modules.EntityService.EntityService {
    return this.get('entityService');
  }

  get documents(): Modules.Documents.Service {
    return this.get('documents');
  }

  get features(): FeaturesService {
    return this.get('features');
  }

  get fetch(): Modules.Fetch.Fetch {
    return this.get('fetch');
  }

  get cron(): Modules.Cron.CronService {
    return this.get('cron');
  }

  get log(): Logger {
    return this.get('logger');
  }

  get startupLogger(): Core.StartupLogger {
    return this.get('startupLogger');
  }

  get eventHub(): Modules.EventHub.EventHub {
    return this.get('eventHub');
  }

  get fs(): Core.StrapiFS {
    return this.get('fs');
  }

  get server(): Modules.Server.Server {
    return this.get('server');
  }

  get telemetry(): Modules.Metrics.TelemetryService {
    return this.get('telemetry');
  }

  get store(): Modules.CoreStore.CoreStore {
    return this.get('coreStore');
  }

  get config() {
    return this.get('config');
  }

  get services() {
    return this.get('services').getAll();
  }

  service(uid: UID.Service) {
    return this.get('services').get(uid);
  }

  get controllers() {
    return this.get('controllers').getAll();
  }

  controller(uid: UID.Controller) {
    return this.get('controllers').get(uid);
  }

  get contentTypes(): Schema.ContentTypes {
    return this.get('content-types').getAll();
  }

  contentType(name: UID.ContentType) {
    return this.get('content-types').get(name);
  }

  get components(): Schema.Components {
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

  get plugins(): Record<string, Core.Plugin> {
    return this.get('plugins').getAll();
  }

  plugin(name: string): Core.Plugin {
    return this.get('plugins').get(name);
  }

  get hooks() {
    return this.get('hooks').getAll();
  }

  hook(name: string) {
    return this.get('hooks').get(name);
  }

  get apis() {
    return this.get('apis').getAll();
  }

  api(name: string): Core.Module {
    return this.get('apis').get(name);
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

  // TODO: split into more providers
  registerInternalServices() {
    const config = createConfigProvider(this.internal_config, this);

    const logger = createLogger({
      level: 'http', // Strapi defaults to level 'http'
      ...config.get('logger'), // DEPRECATED
      ...config.get('server.logger.config'),
    });

    // Instantiate the Strapi container
    this.add('config', () => config)
      .add('query-params', createQueryParamService(this))
      .add('content-api', createContentAPI(this))
      .add('auth', createAuth())
      .add('server', () => createServer(this))
      .add('fs', () => createStrapiFs(this))
      .add('eventHub', () => createEventHub())
      .add('startupLogger', () => utils.createStartupLogger(this))
      .add('logger', () => logger)
      .add('fetch', () => utils.createStrapiFetch(this))
      .add('features', () => createFeaturesService(this))
      .add('requestContext', requestContext)
      .add('customFields', createCustomFields(this))
      .add('entityValidator', entityValidator)
      .add('entityService', () => createEntityService({ strapi: this, db: this.db }))
      .add('documents', () => createDocumentService(this))
      .add(
        'db',
        () =>
          new Database(
            _.merge(this.config.get('database'), {
              logger,
              settings: {
                migrations: {
                  dir: path.join(this.dirs.app.root, 'database/migrations'),
                },
              },
            })
          )
      )
      .add('reload', () => createReloader(this));
  }

  sendStartupTelemetry() {
    // Emit started event.
    // do not await to avoid slower startup
    // This event is anonymous
    this.telemetry
      .send('didStartServer', {
        groupProperties: {
          database: this.config.get('database.connection.client'),
          plugins: Object.keys(this.plugins),
          numberOfAllContentTypes: _.size(this.contentTypes), // TODO: V5: This event should be renamed numberOfContentTypes in V5 as the name is already taken to describe the number of content types using i18n.
          numberOfComponents: _.size(this.components),
          numberOfDynamicZones: getNumberOfDynamicZones(),
          numberOfCustomControllers: Object.values<Core.Controller>(this.controllers).filter(
            // TODO: Fix this at the content API loader level to prevent future types issues
            (controller) => controller !== undefined && factories.isCustomController(controller)
          ).length,
          environment: this.config.environment,
          // TODO: to add back
          // providers: this.config.installedProviders,
        },
      })
      .catch(this.log.error);
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

    this.log.info('Strapi started successfully');
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

  async load() {
    await this.register();
    await this.bootstrap();

    this.isLoaded = true;

    return this;
  }

  async register() {
    // @ts-expect-error: init is internal
    this.ee.init(this.dirs.app.root, this.log);

    for (const provider of providers) {
      await provider.register?.(this);
    }

    await this.runPluginsLifecycles(utils.LIFECYCLES.REGISTER);
    await this.runUserLifecycles(utils.LIFECYCLES.REGISTER);

    // NOTE: Swap type customField for underlying data type
    utils.convertCustomFieldType(this);

    return this;
  }

  async bootstrap() {
    this.configureGlobalProxy();

    const models = [
      ...utils.transformContentTypesToModels(
        [...Object.values(this.contentTypes), ...Object.values(this.components)],
        this.db.metadata.identifiers
      ),
      ...this.get('models').get(),
    ];

    await this.db.init({ models });

    let oldContentTypes;
    if (await this.db.getSchemaConnection().hasTable(coreStoreModel.tableName)) {
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
      await utils.ee.checkLicense({ strapi: this });
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

    await this.server.initMiddlewares();
    this.server.initRouting();

    await this.contentAPI.permissions.registerActions();

    await this.runPluginsLifecycles(utils.LIFECYCLES.BOOTSTRAP);

    for (const provider of providers) {
      await provider.bootstrap?.(this);
    }

    await this.runUserLifecycles(utils.LIFECYCLES.BOOTSTRAP);

    return this;
  }

  configureGlobalProxy() {
    const globalProxy = this.config.get('server.proxy.global');
    const httpProxy = this.config.get('server.proxy.http') || globalProxy;
    const httpsProxy = this.config.get('server.proxy.https') || globalProxy;

    if (!httpProxy && !httpsProxy) {
      return;
    }

    globalAgent.bootstrap();

    if (httpProxy) {
      this.log.info(`Using HTTP proxy: ${httpProxy}`);
      (global as any).GLOBAL_AGENT.HTTP_PROXY = httpProxy;
    }

    if (httpsProxy) {
      this.log.info(`Using HTTPS proxy: ${httpsProxy}`);
      (global as any).GLOBAL_AGENT.HTTPS_PROXY = httpsProxy;
    }
  }

  async destroy() {
    this.log.info('Shutting down Strapi');
    await this.runPluginsLifecycles(utils.LIFECYCLES.DESTROY);

    for (const provider of providers) {
      await provider.destroy?.(this);
    }

    await this.runUserLifecycles(utils.LIFECYCLES.DESTROY);

    await this.server.destroy();

    this.eventHub.destroy();

    await this.db?.destroy();

    process.removeAllListeners();

    // @ts-expect-error: Allow clean delete of global.strapi to allow re-instanciation
    delete global.strapi;

    this.log.info('Strapi has been shut down');
  }

  async runPluginsLifecycles(lifecycleName: 'register' | 'bootstrap' | 'destroy') {
    // plugins
    await this.get('modules')[lifecycleName]();
  }

  async runUserLifecycles(lifecycleName: 'register' | 'bootstrap' | 'destroy') {
    // user
    const userLifecycleFunction = this.app && this.app[lifecycleName];
    if (isFunction(userLifecycleFunction)) {
      await userLifecycleFunction({ strapi: this });
    }
  }

  getModel(uid: UID.ContentType): Schema.ContentType;
  getModel(uid: UID.Component): Schema.Component;
  getModel<TUID extends UID.Schema>(uid: TUID): Schema.ContentType | Schema.Component | undefined {
    if (uid in this.contentTypes) {
      return this.contentTypes[uid as UID.ContentType];
    }

    if (uid in this.components) {
      return this.components[uid as UID.Component];
    }
  }

  /**
   * @deprecated Use `strapi.db.query` instead
   */
  query(uid: UID.Schema) {
    return this.db.query(uid);
  }
}

export interface StrapiOptions {
  appDir: string;
  distDir: string;
  autoReload?: boolean;
  serveAdminPanel?: boolean;
}

export default Strapi;
