import { bootstrap as bootstrapGlobalAgent } from 'global-agent';
import path from 'path';
import _ from 'lodash';
import { isFunction } from 'lodash/fp';
import type { Span } from '@opentelemetry/api';
import { Logger, createLogger } from '@strapi/logger';
import { Database, type DatabaseQueryTelemetryInfo } from '@strapi/database';

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
import {
  beginDeferredStartupRootSpan,
  continueDeferredStartupRootSpan,
  endDeferredStartupRootSpan,
  registerOpenTelemetryTracing,
  withStartupSpan,
  withStartupTraceChildPhase,
} from './services/observability/opentelemetry-tracing';
import createEntityService from './services/entity-service';
import createQueryParamService from './services/query-params';

import entityValidator from './services/entity-validator';
import requestContext from './services/request-context';
import createAuth from './services/auth';
import createCustomFields from './services/custom-fields';
import createContentAPI from './services/content-api';
import getNumberOfDynamicZones from './services/utils/dynamic-zones';
import getNumberOfConditionalFields from './services/utils/conditional-fields';
import { FeaturesService, createFeaturesService } from './services/features';
import { createDocumentService } from './services/document-service';
import { createContentSourceMapsService } from './services/content-source-maps';
import {
  bridgeDatabasePerformanceEvents,
  createPerformanceEventsPublicApi,
} from './services/performance';

import { coreStoreModel } from './services/core-store';
import { createConfigProvider } from './services/config';

import { cleanComponentJoinTable } from './services/document-service/utils/clean-component-join-table';

import { isServerRequestPerfTrackingEnabled } from './utils/server-performance-tracking';
import { mergeQueryTelemetryIntoStats, type PerfQueryAgg } from './utils/perf-query-stats';

// Lazy: only resolved when `useTypescriptMigrations` is true (default false)
let lazyTsUtils: typeof import('@strapi/typescript-utils') | undefined;
const tsUtils = (): typeof import('@strapi/typescript-utils') => {
  if (!lazyTsUtils) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    lazyTsUtils = require('@strapi/typescript-utils');
  }
  return lazyTsUtils as typeof import('@strapi/typescript-utils');
};

class Strapi extends Container implements Core.Strapi {
  app: any;

  isLoaded: boolean = false;

  /** Root `strapi.startup` span left open after `load()` until `start()` runs listen (develop path). */
  private deferredStartupRootSpan?: Span;

  internal_config: Record<string, unknown> = {};

  constructor(opts: StrapiOptions) {
    super();

    this.internal_config = loadConfiguration(opts);

    this.registerInternalServices();

    for (const { definition } of providers) {
      definition.init?.(this);
    }
  }

  get admin(): Core.Module {
    return this.get('admin');
  }

  get ai(): Modules.AI.AiNamespace {
    return this.get('ai');
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

  get performanceEvents(): Modules.PerformanceEvents.PerformanceEventsPublicApi {
    return this.get('performanceEvents');
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

  get sessionManager(): Modules.SessionManager.SessionManagerService {
    return this.get('sessionManager');
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
      registerOpenTelemetryTracing(this as Core.Strapi);

      const deferred = this.deferredStartupRootSpan;

      if (deferred) {
        try {
          await continueDeferredStartupRootSpan(deferred, async () => {
            await withStartupSpan(this as Core.Strapi, 'strapi.startup.listen', () =>
              this.listen()
            );
          });
        } finally {
          endDeferredStartupRootSpan(deferred);
          this.deferredStartupRootSpan = undefined;
        }

        return this;
      }

      await withStartupSpan(
        this as Core.Strapi,
        'strapi.startup',
        async () => {
          if (!this.isLoaded) {
            await this.registerAndBootstrap();
            this.isLoaded = true;
          }

          await withStartupSpan(this as Core.Strapi, 'strapi.startup.listen', () => this.listen());
        },
        { root: true }
      );

      return this;
    } catch (error) {
      return this.stopWithError(error);
    }
  }

  /** Runs `register` then `bootstrap` (used by `load` and `start`). */
  private async registerAndBootstrap(): Promise<void> {
    await this.register();
    await this.bootstrap();
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
      .add('eventHub', () =>
        createEventHub({
          onSubscriberError: (error, { eventName, phase }) => {
            try {
              this.log.warn(
                `[event-hub] ${phase} handler failed for "${eventName}": ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
            } catch {
              console.warn('[strapi:event-hub]', phase, eventName, error);
            }
          },
        })
      )
      .add('performanceEvents', () => createPerformanceEventsPublicApi(this))
      .add('startupLogger', () => utils.createStartupLogger(this))
      .add('logger', () => logger)
      .add('fetch', () => utils.createStrapiFetch(this))
      .add('features', () => createFeaturesService(this))
      .add('requestContext', requestContext)
      .add('customFields', createCustomFields(this))
      .add('entityValidator', entityValidator)
      .add(
        'perfQueryStats',
        () => new Map<string, { count: number; totalMs: number; slowOrErrorEvents: number }>()
      )
      .add('entityService', () => createEntityService({ strapi: this, db: this.db }))
      .add('documents', () => createDocumentService(this))
      .add('db', () => {
        const useTSM = this.config.get('database.settings.useTypescriptMigrations') === true;
        const tsDir = useTSM ? tsUtils().resolveOutDirSync(this.dirs.app.root) : null;
        const tsMigrationsEnabled = useTSM && tsDir;
        const projectDir = tsMigrationsEnabled ? tsDir : this.dirs.app.root;
        const dbPerformanceEnabled = this.config.get('database.performance.enabled') === true;
        const requestPerfTrackingEnabled = isServerRequestPerfTrackingEnabled(this);

        /* eslint-disable object-shorthand -- arrows preserve outer Strapi `this`; method shorthand binds wrong `this` */
        const perfRequestHooks =
          dbPerformanceEnabled || requestPerfTrackingEnabled
            ? {
                performance: {
                  getRequestId: () => {
                    const ctx = requestContext.get();
                    return (ctx?.state as { strapiPerfRequestId?: string } | undefined)
                      ?.strapiPerfRequestId;
                  },
                  ...(requestPerfTrackingEnabled
                    ? {
                        notifyQueryTelemetry: ({
                          durationMs,
                          requestId,
                          slowOrErrorEventEmitted,
                        }: DatabaseQueryTelemetryInfo) => {
                          if (!requestId) {
                            return;
                          }

                          mergeQueryTelemetryIntoStats(
                            this.get('perfQueryStats') as Map<string, PerfQueryAgg>,
                            requestId,
                            durationMs,
                            slowOrErrorEventEmitted
                          );
                        },
                      }
                    : {}),
                },
              }
            : {};
        /* eslint-enable object-shorthand */

        const dbConfig = _.merge(
          {},
          this.config.get('database'),
          {
            logger,
            settings: {
              migrations: {
                dir: path.join(projectDir, 'database/migrations'),
              },
            },
          },
          perfRequestHooks
        );

        // `output` is a core-owned sink concern (read directly below for the bridge/artifact);
        // keep the DB's `performance` config purely about query capture.
        if (dbConfig.performance && typeof dbConfig.performance === 'object') {
          delete (dbConfig.performance as { output?: unknown }).output;
        }

        const db = new Database(dbConfig);

        const perfOutput = this.config.get('database.performance.output', 'none');
        bridgeDatabasePerformanceEvents({
          db,
          eventHub: this.eventHub,
          logger,
          output: perfOutput,
        });

        return db;
      })
      .add('reload', () => createReloader(this))
      .add('content-source-maps', () => createContentSourceMapsService(this));
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
          numberOfConditionalFields: getNumberOfConditionalFields(),
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
    registerOpenTelemetryTracing(this as Core.Strapi);

    const span = await beginDeferredStartupRootSpan(this as Core.Strapi, () =>
      this.registerAndBootstrap()
    );

    if (span) {
      this.deferredStartupRootSpan = span;
    }

    this.isLoaded = true;

    return this;
  }

  withStartupTraceChild<T>(spanName: string, fn: () => Promise<T>): Promise<T> {
    return withStartupTraceChildPhase(
      this.deferredStartupRootSpan,
      this as Core.Strapi,
      spanName,
      fn
    );
  }

  async register() {
    registerOpenTelemetryTracing(this as Core.Strapi);

    await withStartupSpan(this as Core.Strapi, 'strapi.startup.register', async () => {
      // @ts-expect-error: init is internal
      this.ee.init(this.dirs.app.root, this.log);

      for (const { name, definition } of providers) {
        await withStartupSpan(
          this as Core.Strapi,
          `strapi.startup.provider.register.${name}`,
          async () => {
            await definition.register?.(this);
          }
        );
      }

      await withStartupSpan(this as Core.Strapi, 'strapi.startup.plugins.lifecycle.register', () =>
        this.runPluginsLifecycles(utils.LIFECYCLES.REGISTER)
      );

      await withStartupSpan(this as Core.Strapi, 'strapi.startup.user.lifecycle.register', () =>
        this.runUserLifecycles(utils.LIFECYCLES.REGISTER)
      );

      // NOTE: Swap type customField for underlying data type
      await withStartupSpan(this as Core.Strapi, 'strapi.startup.register.custom_fields', () =>
        Promise.resolve(utils.convertCustomFieldType(this))
      );
    });

    return this;
  }

  async bootstrap() {
    await withStartupSpan(this as Core.Strapi, 'strapi.startup.bootstrap', async () => {
      await withStartupSpan(this as Core.Strapi, 'strapi.startup.bootstrap.configure_proxy', () =>
        Promise.resolve(this.configureGlobalProxy())
      );

      const models = await withStartupSpan(
        this as Core.Strapi,
        'strapi.startup.bootstrap.build_models',
        async () => [
          ...utils.transformContentTypesToModels(
            [...Object.values(this.contentTypes), ...Object.values(this.components)],
            this.db.metadata.identifiers
          ),
          ...this.get('models').get(),
        ]
      );

      await withStartupSpan(this as Core.Strapi, 'strapi.startup.bootstrap.db.init', () =>
        this.db.init({ models })
      );

      let oldContentTypes: unknown;
      await withStartupSpan(
        this as Core.Strapi,
        'strapi.startup.bootstrap.content_types.before_sync',
        async () => {
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
        }
      );

      // NOTE: commenting out repair logic for now as it is causing relationship loss in some cases
      // will revisit soon in the future PR

      const status = await withStartupSpan(
        this as Core.Strapi,
        'strapi.startup.bootstrap.db.schema_sync',
        () => this.db.schema.sync()
      );

      // // if schemas have changed, run repairs
      if (status === 'CHANGED') {
        await withStartupSpan(
          this as Core.Strapi,
          'strapi.startup.bootstrap.db.repair_morph',
          async () => {
            await this.db.repair.removeOrphanMorphType({ pivot: 'component_type' });
            await this.db.repair.removeOrphanMorphType({ pivot: 'related_type' });
          }
        );
      }

      const alreadyRanComponentRepair = await this.store.get({
        type: 'strapi',
        key: 'unidirectional-join-table-repair-ran',
      });

      if (!alreadyRanComponentRepair) {
        await withStartupSpan(
          this as Core.Strapi,
          'strapi.startup.bootstrap.db.repair_join_tables',
          async () => {
            await this.db.repair.processUnidirectionalJoinTables(cleanComponentJoinTable);
            await this.store.set({
              type: 'strapi',
              key: 'unidirectional-join-table-repair-ran',
              value: true,
            });
          }
        );
      }

      if (this.EE) {
        await withStartupSpan(this as Core.Strapi, 'strapi.startup.bootstrap.ee.license', () =>
          utils.ee.checkLicense({ strapi: this })
        );
      }

      await withStartupSpan(
        this as Core.Strapi,
        'strapi.startup.bootstrap.content_types.after_sync',
        async () => {
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
        }
      );

      await withStartupSpan(
        this as Core.Strapi,
        'strapi.startup.bootstrap.server.init',
        async () => {
          await this.server.initMiddlewares();
          this.server.initRouting();
        }
      );

      await withStartupSpan(
        this as Core.Strapi,
        'strapi.startup.bootstrap.content_api.permissions',
        () => this.contentAPI.permissions.registerActions()
      );

      await withStartupSpan(this as Core.Strapi, 'strapi.startup.plugins.lifecycle.bootstrap', () =>
        this.runPluginsLifecycles(utils.LIFECYCLES.BOOTSTRAP)
      );

      for (const { name, definition } of providers) {
        await withStartupSpan(
          this as Core.Strapi,
          `strapi.startup.provider.bootstrap.${name}`,
          async () => {
            await definition.bootstrap?.(this);
          }
        );
      }

      await withStartupSpan(this as Core.Strapi, 'strapi.startup.user.lifecycle.bootstrap', () =>
        this.runUserLifecycles(utils.LIFECYCLES.BOOTSTRAP)
      );
    });

    return this;
  }

  configureGlobalProxy() {
    const globalProxy = this.config.get('server.proxy.global');
    const httpProxy = this.config.get('server.proxy.http') || globalProxy;
    const httpsProxy = this.config.get('server.proxy.https') || globalProxy;

    if (!httpProxy && !httpsProxy) {
      return;
    }

    bootstrapGlobalAgent();

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
    endDeferredStartupRootSpan(this.deferredStartupRootSpan);
    this.deferredStartupRootSpan = undefined;

    this.log.info('Shutting down Strapi');
    await this.runPluginsLifecycles(utils.LIFECYCLES.DESTROY);

    for (const { definition } of providers) {
      await definition.destroy?.(this);
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
