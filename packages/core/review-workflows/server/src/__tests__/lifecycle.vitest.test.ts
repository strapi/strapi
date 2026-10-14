/**
 * Pins what the plugin `register` and `bootstrap` lifecycles do, called through the plugin entry
 * the way core calls them. The afterSync data migrations are exercised by running every handler
 * registered on `strapi::content-types.afterSync`, as core does after a schema sync.
 *
 * The same mock is handed to the lifecycles and stubbed as the global `strapi`, so these tests hold
 * whether the code reads the injected instance or the global one.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import defaultStages from '../constants/default-stages.json';
import {
  ENTITY_ASSIGNEE_ATTRIBUTE,
  ENTITY_STAGE_ATTRIBUTE,
  MAX_STAGES_PER_WORKFLOW,
  MAX_WORKFLOWS,
  STAGE_DEFAULT_COLOR,
  STAGE_MODEL_UID,
  STAGE_TRANSITION_UID,
  WORKFLOW_MODEL_UID,
} from '../constants/workflows';

type UnknownRecord = Record<string, unknown>;
type Factory = (params: { strapi: unknown }) => unknown;
type Lifecycle = (params: { strapi: unknown }) => unknown;
type PluginEntry = { register: Lifecycle; bootstrap?: Lifecycle; services?: UnknownRecord };
type AfterSyncParams = { oldContentTypes?: UnknownRecord; contentTypes?: UnknownRecord };
type AfterSyncHandler = (params: AfterSyncParams) => Promise<void>;

const AFTER_SYNC = 'strapi::content-types.afterSync';

const createQuery = () => ({
  findOne: vi.fn(async (): Promise<unknown> => null),
  findMany: vi.fn(async (): Promise<unknown[]> => []),
  update: vi.fn(async () => ({})),
  updateMany: vi.fn(async () => ({})),
});

type StrapiMockOptions = {
  featureEnabled?: boolean;
  feature?: UnknownRecord;
  contentTypes?: UnknownRecord;
  metadata?: Record<string, unknown>;
  services?: UnknownRecord;
  auditLogsLifecycle?: { registerEvent: ReturnType<typeof vi.fn> };
  storedMetrics?: UnknownRecord;
  supportsJsonSuperset?: boolean;
};

const createStrapiMock = (options: StrapiMockOptions = {}) => {
  const entry: { plugin?: PluginEntry } = {};
  const resolvedServices = new Map<string, unknown>();
  const queries = new Map<string, ReturnType<typeof createQuery>>();
  const hooks = new Map<string, unknown[]>();
  const calls: string[] = [];

  const admin = {
    permission: {
      actionProvider: {
        registerMany: vi.fn<(actions: { uid: string }[]) => Promise<void>>(async () => {}),
      },
    },
    'persist-tables': {
      removePersistedTablesWithSuffix: vi.fn(async (suffix: string) => {
        calls.push(`remove ${suffix}`);
      }),
      persistTables: vi.fn(async (tables: { name: string }[]) => {
        calls.push(`persist ${tables.map((table) => table.name).join(',')}`);
      }),
    },
  };

  const webhookStore = { addAllowedEvent: vi.fn() };
  const contentTypesRegistry = { extend: vi.fn() };

  const strapi = {
    ee: {
      features: {
        isEnabled: vi.fn(() => options.featureEnabled !== false),
        get: vi.fn(() => options.feature),
      },
      entitlements: { register: vi.fn() },
    },
    contentTypes: options.contentTypes ?? {},
    hook: vi.fn((name: string) => {
      const handlers = hooks.get(name) ?? [];
      hooks.set(name, handlers);
      const hook = {
        register(handler: unknown) {
          handlers.push(handler);
          return hook;
        },
      };
      return hook;
    }),
    has: vi.fn((name: string) => {
      return name === 'audit-logs-lifecycle' && options.auditLogsLifecycle !== undefined;
    }),
    get: vi.fn((name: string) => {
      if (name === 'webhookStore') return webhookStore;
      if (name === 'content-types') return contentTypesRegistry;
      if (name === 'audit-logs-lifecycle') return options.auditLogsLifecycle;
      throw new Error(`Unexpected strapi.get(${name})`);
    }),
    service: vi.fn((uid: string) => admin[uid.replace('admin::', '') as keyof typeof admin]),
    plugin: vi.fn((name: string) => {
      if (name !== 'review-workflows') {
        throw new Error(`Unexpected strapi.plugin(${name})`);
      }

      return {
        service(serviceName: string) {
          if (options.services?.[serviceName] !== undefined) {
            return options.services[serviceName];
          }
          // Resolve the real service like the core service registry does
          if (resolvedServices.has(serviceName) === false) {
            const value = entry.plugin?.services?.[serviceName];
            resolvedServices.set(
              serviceName,
              typeof value === 'function' ? (value as Factory)({ strapi }) : value
            );
          }
          return resolvedServices.get(serviceName);
        },
      };
    }),
    db: {
      query: vi.fn((uid: string) => {
        if (queries.has(uid) === false) {
          queries.set(uid, createQuery());
        }
        return queries.get(uid)!;
      }),
      metadata: { get: vi.fn((uid: string) => options.metadata?.[uid]) },
      dialect: {
        supportsOperator: vi.fn((operator: string) => {
          return operator === '$jsonSupersetOf' && options.supportsJsonSuperset !== false;
        }),
      },
    },
    documents: { use: vi.fn() },
    server: { router: { use: vi.fn() } },
    cron: { add: vi.fn() },
    store: { get: vi.fn(async () => options.storedMetrics), set: vi.fn(async () => {}) },
    telemetry: { send: vi.fn() },
    log: { info: vi.fn(), warn: vi.fn() },
  };

  const query = (uid: string) => strapi.db.query(uid);
  const afterSyncHandlers = () => (hooks.get(AFTER_SYNC) ?? []) as AfterSyncHandler[];
  const runAfterSync = async (params: AfterSyncParams) => {
    for (const handler of afterSyncHandlers()) {
      await handler(params);
    }
  };

  return {
    strapi,
    entry,
    admin,
    webhookStore,
    contentTypesRegistry,
    calls,
    query,
    afterSyncHandlers,
    runAfterSync,
  };
};

type StrapiMock = ReturnType<typeof createStrapiMock>;

const loadPlugin = async (mock: StrapiMock) => {
  vi.stubGlobal('strapi', mock.strapi);
  const { default: pluginServer } = await import('../index');
  // Core spreads the entry into the loaded plugin
  mock.entry.plugin = { ...pluginServer } as unknown as PluginEntry;

  return mock.entry.plugin;
};

const register = async (options: StrapiMockOptions = {}) => {
  const mock = createStrapiMock({
    ...options,
    services: { validation: { register: vi.fn() }, ...options.services },
  });
  const plugin = await loadPlugin(mock);
  await plugin.register({ strapi: mock.strapi });

  return mock;
};

describe('review-workflows lifecycles', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('register', () => {
    it('registers seven afterSync handlers on the content types sync hook', async () => {
      const mock = await register();

      expect(mock.strapi.hook).toHaveBeenCalledWith(AFTER_SYNC);
      expect(mock.afterSyncHandlers()).toHaveLength(7);
      for (const handler of mock.afterSyncHandlers()) {
        expect(typeof handler).toBe('function');
      }
    });

    it('persists the stage and assignee join tables of review workflow content types', async () => {
      const contentTypes = {
        'api::article.article': {
          attributes: { [ENTITY_STAGE_ATTRIBUTE]: {}, [ENTITY_ASSIGNEE_ATTRIBUTE]: {} },
        },
        'api::page.page': { attributes: {} },
        'api::hidden.hidden': {
          pluginOptions: { 'content-manager': { visible: false } },
          attributes: { [ENTITY_STAGE_ATTRIBUTE]: {} },
        },
      };
      const mock = await register({
        metadata: {
          'api::article.article': {
            tableName: 'articles',
            attributes: {
              [ENTITY_STAGE_ATTRIBUTE]: { joinTable: { name: 'articles_strapi_stage_lnk' } },
              [ENTITY_ASSIGNEE_ATTRIBUTE]: { joinTable: { name: 'articles_strapi_assignee_lnk' } },
            },
          },
        },
      });

      await mock.runAfterSync({ oldContentTypes: contentTypes, contentTypes });

      expect(mock.calls).toEqual([
        'remove _strapi_stage_lnk',
        'persist articles_strapi_stage_lnk',
        'remove _strapi_assignee_lnk',
        'persist articles_strapi_assignee_lnk',
      ]);
      expect(mock.admin['persist-tables'].persistTables).toHaveBeenNthCalledWith(1, [
        { name: 'articles_strapi_stage_lnk', dependsOn: [{ name: 'articles' }] },
      ]);
      expect(mock.admin['persist-tables'].persistTables).toHaveBeenNthCalledWith(2, [
        { name: 'articles_strapi_assignee_lnk', dependsOn: [{ name: 'articles' }] },
      ]);
    });

    it('moves the reviewWorkflows option of content-type-builder requests', async () => {
      const mock = await register();

      expect(mock.strapi.server.router.use).toHaveBeenCalledTimes(1);
      expect(mock.strapi.server.router.use).toHaveBeenCalledWith(
        '/content-type-builder/content-types/:uid?',
        expect.any(Function)
      );
    });

    it('adds the stage and assignee attributes to visible content types', async () => {
      const mock = await register({
        contentTypes: {
          'api::article.article': { attributes: {} },
          'api::hidden.hidden': {
            pluginOptions: { 'content-manager': { visible: false } },
            attributes: {},
          },
          'api::opt-out.opt-out': { options: { noStageAttribute: true }, attributes: {} },
        },
      });

      const { extend } = mock.contentTypesRegistry;
      expect(extend).toHaveBeenCalledTimes(1);
      expect(extend).toHaveBeenCalledWith('api::article.article', expect.any(Function));

      const contentType = { attributes: {} };
      extend.mock.calls[0][1](contentType);
      expect(contentType.attributes).toEqual({
        [ENTITY_STAGE_ATTRIBUTE]: expect.objectContaining({
          type: 'relation',
          relation: 'oneToOne',
          target: STAGE_MODEL_UID,
          useJoinTable: true,
        }),
        [ENTITY_ASSIGNEE_ATTRIBUTE]: expect.objectContaining({
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
          useJoinTable: true,
        }),
      });
    });

    it('registers the license limits on the validation service, with defaults', async () => {
      const validation = { register: vi.fn() };
      await register({ services: { validation } });

      expect(validation.register).toHaveBeenCalledWith({
        numberOfWorkflows: MAX_WORKFLOWS,
        stagesPerWorkflow: MAX_STAGES_PER_WORKFLOW,
      });
    });

    it('registers the license limits read from the feature', async () => {
      const validation = { register: vi.fn() };
      await register({
        feature: { name: 'review-workflows', numberOfWorkflows: 3 },
        services: { validation },
      });

      expect(validation.register).toHaveBeenCalledWith({
        name: 'review-workflows',
        numberOfWorkflows: 3,
        stagesPerWorkflow: MAX_STAGES_PER_WORKFLOW,
      });
    });

    it('registers the review workflows entitlements', async () => {
      const mock = await register();

      expect(mock.strapi.ee.entitlements.register).toHaveBeenCalledWith(
        expect.objectContaining({ feature: 'review-workflows' })
      );
    });

    it('only registers the entitlements when the feature is disabled', async () => {
      const mock = await register({ featureEnabled: false });

      expect(mock.strapi.ee.entitlements.register).toHaveBeenCalledWith(
        expect.objectContaining({ feature: 'review-workflows' })
      );
      expect(mock.strapi.hook).not.toHaveBeenCalled();
      expect(mock.strapi.server.router.use).not.toHaveBeenCalled();
    });
  });

  describe('afterSync data migrations', () => {
    it('write nothing when the review workflow schemas did not change', async () => {
      const contentTypes = {
        [STAGE_MODEL_UID]: { attributes: { color: {}, permissions: {}, toPermissions: {} } },
        [WORKFLOW_MODEL_UID]: { attributes: { name: {}, contentTypes: {} } },
      };
      const mock = await register();

      await mock.runAfterSync({ oldContentTypes: contentTypes, contentTypes });

      for (const uid of [STAGE_MODEL_UID, WORKFLOW_MODEL_UID, 'admin::role']) {
        const query = mock.query(uid);
        expect(query.findOne).not.toHaveBeenCalled();
        expect(query.findMany).not.toHaveBeenCalled();
        expect(query.update).not.toHaveBeenCalled();
        expect(query.updateMany).not.toHaveBeenCalled();
      }
    });

    it('set the default color on stages when the color attribute is added', async () => {
      const mock = await register();

      await mock.runAfterSync({
        oldContentTypes: { [STAGE_MODEL_UID]: { attributes: {} } },
        contentTypes: { [STAGE_MODEL_UID]: { attributes: { color: {} } } },
      });

      expect(mock.query(STAGE_MODEL_UID).updateMany).toHaveBeenCalledTimes(1);
      expect(mock.query(STAGE_MODEL_UID).updateMany).toHaveBeenCalledWith({
        data: { color: STAGE_DEFAULT_COLOR },
      });
    });

    it('give every role the "from" permission on every stage when permissions are added', async () => {
      const stagePermissions = {
        registerMany: vi.fn(async (permissions: { roleId: number; fromStage: number }[]) =>
          permissions.map(({ roleId, fromStage }) => [{ id: fromStage * 100 + roleId }])
        ),
      };
      const mock = createStrapiMock({
        services: { validation: { register: vi.fn() }, 'stage-permissions': stagePermissions },
      });
      mock.query(STAGE_MODEL_UID).findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      mock.query('admin::role').findMany.mockResolvedValue([{ id: 10 }, { id: 20 }]);
      const plugin = await loadPlugin(mock);
      await plugin.register({ strapi: mock.strapi });

      await mock.runAfterSync({
        oldContentTypes: { [STAGE_MODEL_UID]: { attributes: {} } },
        contentTypes: { [STAGE_MODEL_UID]: { attributes: { permissions: {} } } },
      });

      expect(mock.strapi.log.info).toHaveBeenCalledTimes(1);
      expect(stagePermissions.registerMany.mock.calls).toEqual([
        [
          [
            { roleId: 10, fromStage: 1, action: STAGE_TRANSITION_UID },
            { roleId: 20, fromStage: 1, action: STAGE_TRANSITION_UID },
          ],
        ],
        [
          [
            { roleId: 10, fromStage: 2, action: STAGE_TRANSITION_UID },
            { roleId: 20, fromStage: 2, action: STAGE_TRANSITION_UID },
          ],
        ],
      ]);
      expect(mock.query(STAGE_MODEL_UID).update.mock.calls).toEqual([
        [{ where: { id: 1 }, data: { permissions: [110, 120] } }],
        [{ where: { id: 2 }, data: { permissions: [210, 220] } }],
      ]);
    });

    it('skip stages without a numerical id when adding "from" permissions', async () => {
      const stagePermissions = { registerMany: vi.fn(async () => []) };
      const mock = createStrapiMock({
        services: { validation: { register: vi.fn() }, 'stage-permissions': stagePermissions },
      });
      mock.query(STAGE_MODEL_UID).findMany.mockResolvedValue([{ id: 'abc' }]);
      mock.query('admin::role').findMany.mockResolvedValue([{ id: 10 }]);
      const plugin = await loadPlugin(mock);
      await plugin.register({ strapi: mock.strapi });

      await mock.runAfterSync({
        oldContentTypes: { [STAGE_MODEL_UID]: { attributes: {} } },
        contentTypes: { [STAGE_MODEL_UID]: { attributes: { permissions: {} } } },
      });

      expect(mock.strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('with id abc'));
      expect(stagePermissions.registerMany).not.toHaveBeenCalled();
      expect(mock.query(STAGE_MODEL_UID).update).not.toHaveBeenCalled();
    });

    it('give every role the "to" permission on every stage, keeping existing permissions', async () => {
      const stagePermissions = {
        registerManyTo: vi.fn(async (permissions: { roleId: number; toStage: number }[]) =>
          permissions.map(({ roleId, toStage }) => [{ id: toStage * 100 + roleId }])
        ),
      };
      const mock = createStrapiMock({
        services: { validation: { register: vi.fn() }, 'stage-permissions': stagePermissions },
      });
      const stageQuery = mock.query(STAGE_MODEL_UID);
      stageQuery.findMany.mockResolvedValue([{ id: 1 }]);
      stageQuery.findOne.mockResolvedValue({ id: 1, permissions: [{ id: 7 }] });
      mock.query('admin::role').findMany.mockResolvedValue([{ id: 10 }, { id: 20 }]);
      const plugin = await loadPlugin(mock);
      await plugin.register({ strapi: mock.strapi });

      await mock.runAfterSync({
        oldContentTypes: { [STAGE_MODEL_UID]: { attributes: { permissions: {} } } },
        contentTypes: { [STAGE_MODEL_UID]: { attributes: { permissions: {}, toPermissions: {} } } },
      });

      expect(stagePermissions.registerManyTo).toHaveBeenCalledWith([
        { roleId: 10, toStage: 1, action: STAGE_TRANSITION_UID },
        { roleId: 20, toStage: 1, action: STAGE_TRANSITION_UID },
      ]);
      expect(stageQuery.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        populate: { permissions: true },
      });
      expect(stageQuery.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { permissions: [7, 110, 120] },
      });
    });

    it('name unnamed workflows when the name attribute is added', async () => {
      const mock = await register();

      await mock.runAfterSync({
        oldContentTypes: { [WORKFLOW_MODEL_UID]: { attributes: {} } },
        contentTypes: { [WORKFLOW_MODEL_UID]: { attributes: { name: {} } } },
      });

      expect(mock.query(WORKFLOW_MODEL_UID).updateMany).toHaveBeenCalledWith({
        where: { name: { $null: true } },
        data: { name: 'Default' },
      });
    });

    it('assign the content types that used review workflows when contentTypes is added', async () => {
      const mock = await register();

      await mock.runAfterSync({
        oldContentTypes: {
          [WORKFLOW_MODEL_UID]: { attributes: {} },
          'api::article.article': { options: { reviewWorkflows: true } },
          'api::page.page': { options: {} },
        },
        contentTypes: {
          [WORKFLOW_MODEL_UID]: { attributes: { contentTypes: {} } },
          'api::article.article': {},
          'api::page.page': {},
        },
      });

      const workflowQuery = mock.query(WORKFLOW_MODEL_UID);
      expect(workflowQuery.updateMany).toHaveBeenCalledWith({ data: { contentTypes: [] } });
      expect(workflowQuery.update).toHaveBeenCalledWith({
        where: { id: { $notNull: true } },
        data: { contentTypes: ['api::article.article'] },
      });
    });

    it('only reset contentTypes when no content type used review workflows', async () => {
      const mock = await register();

      await mock.runAfterSync({
        oldContentTypes: { [WORKFLOW_MODEL_UID]: { attributes: {} } },
        contentTypes: { [WORKFLOW_MODEL_UID]: { attributes: { contentTypes: {} } } },
      });

      const workflowQuery = mock.query(WORKFLOW_MODEL_UID);
      expect(workflowQuery.updateMany).toHaveBeenCalledWith({ data: { contentTypes: [] } });
      expect(workflowQuery.update).not.toHaveBeenCalled();
    });

    it.each([
      { supportsJsonSuperset: true, filter: { $jsonSupersetOf: '["api::removed.removed"]' } },
      { supportsJsonSuperset: false, filter: { $contains: '"api::removed.removed"' } },
    ])(
      'remove a deleted content type from its workflow (jsonSuperset: $supportsJsonSuperset)',
      async ({ supportsJsonSuperset, filter }) => {
        const mock = createStrapiMock({
          supportsJsonSuperset,
          services: { validation: { register: vi.fn() } },
        });
        const workflowQuery = mock.query(WORKFLOW_MODEL_UID);
        workflowQuery.findOne.mockResolvedValue({
          id: 3,
          contentTypes: ['api::removed.removed', 'api::article.article'],
        });
        const plugin = await loadPlugin(mock);
        await plugin.register({ strapi: mock.strapi });

        await mock.runAfterSync({
          oldContentTypes: { 'api::article.article': {}, 'api::removed.removed': {} },
          contentTypes: { 'api::article.article': {} },
        });

        expect(workflowQuery.findOne).toHaveBeenCalledWith({
          select: ['id', 'contentTypes'],
          where: { contentTypes: filter },
        });
        expect(workflowQuery.update).toHaveBeenCalledWith({
          where: { id: 3 },
          data: { contentTypes: ['api::article.article'] },
        });
      }
    );

    it('leave workflows untouched when no workflow used the deleted content type', async () => {
      const mock = await register();

      await mock.runAfterSync({
        oldContentTypes: { 'api::removed.removed': {} },
        contentTypes: {},
      });

      const workflowQuery = mock.query(WORKFLOW_MODEL_UID);
      expect(workflowQuery.findOne).toHaveBeenCalledTimes(1);
      expect(workflowQuery.update).not.toHaveBeenCalled();
    });
  });

  describe('bootstrap', () => {
    const bootstrap = async (
      options: StrapiMockOptions & { workflowCount?: number; stageCount?: number } = {}
    ) => {
      const workflows = {
        count: vi.fn(async () => options.workflowCount ?? 0),
        create: vi.fn(async () => ({})),
      };
      const stages = { count: vi.fn(async () => options.stageCount ?? 0) };
      const mock = createStrapiMock({
        storedMetrics: { weeklySchedule: '1 2 3 * * 4', lastWeeklyUpdate: Date.now() },
        ...options,
        services: { workflows, stages, ...options.services },
      });
      const plugin = await loadPlugin(mock);
      await plugin.bootstrap?.({ strapi: mock.strapi });

      return { ...mock, workflows, stages };
    };

    it('registers the review workflows permission actions', async () => {
      const mock = await bootstrap();

      const { registerMany } = mock.admin.permission.actionProvider;
      expect(registerMany).toHaveBeenCalledTimes(1);
      expect(registerMany.mock.calls[0][0].map(({ uid }: { uid: string }) => uid))
        .toMatchInlineSnapshot(`
        [
          "review-workflows.create",
          "review-workflows.read",
          "review-workflows.update",
          "review-workflows.delete",
          "review-workflows.stage.transition",
        ]
      `);
    });

    it('allows the review workflows webhook events', async () => {
      const mock = await bootstrap();

      expect(mock.webhookStore.addAllowedEvent.mock.calls).toEqual([
        ['WORKFLOW_UPDATE_STAGE', 'review-workflows.updateEntryStage'],
      ]);
    });

    it('registers the audit log events when the audit logs lifecycle exists', async () => {
      const auditLogsLifecycle = { registerEvent: vi.fn() };
      await bootstrap({ auditLogsLifecycle });

      expect(auditLogsLifecycle.registerEvent.mock.calls.map(([name]) => name).sort()).toEqual([
        'entry.assignee.update',
        'review-workflows.updateEntryStage',
        'workflow.create',
        'workflow.delete',
        'workflow.update',
      ]);
    });

    it('skips the audit log events when the audit logs lifecycle is absent', async () => {
      const mock = await bootstrap();

      expect(mock.strapi.has).toHaveBeenCalledWith('audit-logs-lifecycle');
      expect(mock.strapi.get).not.toHaveBeenCalledWith('audit-logs-lifecycle');
    });

    it('registers the weekly metrics cron at the stored schedule', async () => {
      const mock = await bootstrap();

      expect(mock.strapi.cron.add).toHaveBeenCalledWith({
        reviewWorkflowsWeekly: { task: expect.any(Function), options: '1 2 3 * * 4' },
      });
    });

    it('creates the default workflow when there is no workflow and no stage', async () => {
      const mock = await bootstrap({ workflowCount: 0, stageCount: 0 });

      expect(mock.workflows.create).toHaveBeenCalledWith({
        data: { name: 'Default', contentTypes: [], stages: defaultStages },
      });
    });

    it.each([
      { workflowCount: 1, stageCount: 0 },
      { workflowCount: 0, stageCount: 1 },
    ])(
      'does not create the default workflow ($workflowCount workflows, $stageCount stages)',
      async (counts) => {
        const mock = await bootstrap(counts);

        expect(mock.workflows.create).not.toHaveBeenCalled();
      }
    );

    it('registers the document service middlewares in order', async () => {
      const mock = await bootstrap();
      const middlewares = mock.strapi
        .plugin('review-workflows')
        .service('document-service-middlewares') as Record<string, unknown>;

      expect(mock.strapi.documents.use.mock.calls).toEqual([
        [middlewares.assignStageOnCreate],
        [middlewares.handleStageOnUpdate],
        [middlewares.checkStageBeforePublish],
      ]);
      for (const [middleware] of mock.strapi.documents.use.mock.calls) {
        expect(typeof middleware).toBe('function');
      }
    });
  });
});
