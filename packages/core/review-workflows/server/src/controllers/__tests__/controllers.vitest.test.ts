/**
 * Pins which services the admin controllers call, with which arguments, and their permission
 * checks. Controllers are served the way core serves them: the plugin entry is loaded, `register`
 * runs, routers are instantiated with `{ strapi }`, then actions are resolved from
 * `plugin.controllers`.
 *
 * The same mock is handed to the plugin and stubbed as the global `strapi`, so these tests hold
 * whether the code reads the injected instance or the global one.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ENTITY_STAGE_ATTRIBUTE,
  STAGE_MODEL_UID,
  STAGE_TRANSITION_UID,
  WORKFLOW_MODEL_UID,
  WORKFLOW_POPULATE,
} from '../../constants/workflows';

type UnknownRecord = Record<string, unknown>;
type Factory = (params: { strapi: unknown }) => unknown;
type PluginEntry = {
  register: (params: { strapi: unknown }) => unknown;
  controllers: UnknownRecord;
  routes: UnknownRecord;
};
type TestCtx = {
  params: UnknownRecord;
  query: UnknownRecord;
  request: { body?: UnknownRecord; query?: UnknownRecord };
  state: { userAbility: unknown };
  body?: unknown;
  created: ReturnType<typeof vi.fn>;
  notFound: ReturnType<typeof vi.fn>;
  forbidden: ReturnType<typeof vi.fn>;
  throw: ReturnType<typeof vi.fn>;
};
type Action = (ctx: TestCtx) => Promise<unknown>;

const ARTICLE_UID = 'api::article.article';
const userAbility = { id: 'user-ability' };

const resolveValue = (value: unknown, strapi: unknown) =>
  typeof value === 'function' ? (value as Factory)({ strapi }) : value;

const createPermissionChecker = () => ({
  sanitizedQuery: {
    create: vi.fn(async () => ({ populate: 'create-populate' })),
    update: vi.fn(async () => ({ populate: 'update-populate' })),
    delete: vi.fn(async () => ({ populate: 'delete-populate' })),
    read: vi.fn(async () => ({ populate: 'read-populate', filters: 'filters', sort: 'sort' })),
  },
  sanitizeCreateInput: vi.fn(async (data: UnknownRecord) => ({ ...data, sanitizedInput: true })),
  sanitizeUpdateInput: vi.fn(() => async (data: UnknownRecord) => ({
    ...data,
    sanitizedInput: true,
  })),
  sanitizeOutput: vi.fn(async (data: unknown) => ({ output: data })),
  cannot: { read: vi.fn(() => false) },
});

const createServices = () => ({
  workflows: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    count: vi.fn(async () => 2),
    getAssignedWorkflow: vi.fn(),
    assertContentTypeBelongsToWorkflow: vi.fn(async () => ({ id: 'assigned-workflow' })),
    assertStageBelongsToWorkflow: vi.fn(),
  },
  stages: { find: vi.fn(), findById: vi.fn(), updateEntity: vi.fn() },
  'stage-permissions': {
    can: vi.fn(() => true),
    canTransitionToStage: vi.fn(async () => true),
    canTransitionToStageWithPermissions: vi.fn<(stage: { id: number }) => boolean>(() => true),
  },
  assignees: { updateEntityAssignee: vi.fn() },
  homepage: { getRecentlyAssignedDocuments: vi.fn() },
  validation: { register: vi.fn() },
});

const createStrapiMock = () => {
  const services = createServices();
  const permissionChecker = createPermissionChecker();
  const permissionCheckerService = { create: vi.fn(() => permissionChecker) };
  const findOne = vi.fn();
  const models: UnknownRecord = {
    [ARTICLE_UID]: { attributes: { [ENTITY_STAGE_ATTRIBUTE]: {} } },
    'api::page.page': { attributes: {} },
  };

  const strapi = {
    ee: {
      features: { isEnabled: vi.fn(() => true), get: vi.fn(() => undefined) },
      entitlements: { register: vi.fn() },
    },
    contentTypes: {},
    hook: vi.fn(() => {
      const hook = { register: () => hook };
      return hook;
    }),
    get: vi.fn(() => ({ extend: vi.fn() })),
    service: vi.fn(() => ({})),
    server: { router: { use: vi.fn() } },
    plugin: vi.fn((name: string) => ({
      service(serviceName: string) {
        if (name === 'review-workflows') {
          return services[serviceName as keyof typeof services];
        }
        if (name === 'content-manager' && serviceName === 'permission-checker') {
          return permissionCheckerService;
        }
        throw new Error(`Unexpected service ${name}.${serviceName}`);
      },
    })),
    getModel: vi.fn((uid: string) => models[uid]),
    documents: vi.fn(() => ({ findOne })),
  };

  return { strapi, services, permissionChecker, permissionCheckerService, findOne };
};

type StrapiMock = ReturnType<typeof createStrapiMock>;

const serveControllers = async (mock: StrapiMock) => {
  vi.stubGlobal('strapi', mock.strapi);
  const { default: pluginServer } = await import('../../index');
  const plugin = { ...pluginServer } as unknown as PluginEntry;

  await plugin.register({ strapi: mock.strapi });
  Object.values(plugin.routes).forEach((router) => resolveValue(router, mock.strapi));

  return (handler: string): Action => {
    const [controllerName, actionName] = handler.split('.');
    const controller = resolveValue(plugin.controllers[controllerName], mock.strapi);

    return (controller as Record<string, Action>)[actionName];
  };
};

const createCtx = (overrides: Partial<TestCtx> = {}): TestCtx => ({
  params: {},
  query: {},
  request: { body: {}, query: {} },
  state: { userAbility },
  created: vi.fn(),
  notFound: vi.fn(),
  forbidden: vi.fn(),
  throw: vi.fn((status: number, message: string) => {
    throw Object.assign(new Error(message), { status });
  }),
  ...overrides,
});

const validationErrorWith = (message: string) => ({
  name: 'ValidationError',
  details: { errors: expect.arrayContaining([expect.objectContaining({ message })]) },
});

const permission = (direction: 'from' | 'to', roleId: number) => ({
  action: STAGE_TRANSITION_UID,
  actionParameters: { [direction]: 1 },
  role: { id: roleId },
});

const workflowRow = {
  id: 1,
  name: 'Editorial',
  stages: [{ id: 1, name: 'To do', permissions: [permission('from', 3), permission('to', 4)] }],
};

const workflowForAdmin = {
  id: 1,
  name: 'Editorial',
  stages: [
    {
      id: 1,
      name: 'To do',
      fromPermissions: [{ action: STAGE_TRANSITION_UID, role: 3 }],
      toPermissions: [{ action: STAGE_TRANSITION_UID, role: 4 }],
    },
  ],
};

describe('review-workflows admin controllers', () => {
  let mock: StrapiMock;
  let action: (handler: string) => Action;

  beforeEach(async () => {
    vi.resetModules();
    mock = createStrapiMock();
    action = await serveControllers(mock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('workflows', () => {
    const workflowBody = {
      name: 'Editorial',
      stages: [{ name: 'To do' }],
      contentTypes: [ARTICLE_UID],
    };

    it('create validates, sanitizes and creates the workflow', async () => {
      mock.services.workflows.create.mockResolvedValue(workflowRow);
      const ctx = createCtx({ request: { body: { data: workflowBody }, query: { q: 1 } } });

      await action('workflows.create')(ctx);

      expect(mock.permissionCheckerService.create).toHaveBeenCalledWith({
        userAbility,
        model: WORKFLOW_MODEL_UID,
      });
      expect(mock.permissionChecker.sanitizedQuery.create).toHaveBeenCalledWith({ q: 1 });
      expect(mock.services.workflows.create).toHaveBeenCalledWith({
        data: { ...workflowBody, sanitizedInput: true },
        populate: 'create-populate',
      });
      expect(ctx.created).toHaveBeenCalledWith({ data: { output: workflowForAdmin } });
    });

    it.each([
      ['api::missing.missing', 'Content type api::missing.missing does not exist'],
      ['api::page.page', 'Content type api::page.page does not have review workflow enabled'],
    ])('create rejects the content type %s', async (uid, message) => {
      const ctx = createCtx({
        request: { body: { data: { ...workflowBody, contentTypes: [uid] } }, query: {} },
      });

      await expect(action('workflows.create')(ctx)).rejects.toMatchObject(
        validationErrorWith(message)
      );
      expect(mock.strapi.getModel).toHaveBeenCalledWith(uid);
      expect(mock.services.workflows.create).not.toHaveBeenCalled();
    });

    it('update validates, sanitizes and updates the workflow', async () => {
      const existing = { id: 1, name: 'Old' };
      mock.services.workflows.findById.mockResolvedValue(existing);
      mock.services.workflows.update.mockResolvedValue(workflowRow);
      const ctx = createCtx({
        params: { id: 1 },
        request: { body: { data: { contentTypes: [ARTICLE_UID] } }, query: { q: 1 } },
      });

      await action('workflows.update')(ctx);

      expect(mock.permissionChecker.sanitizedQuery.update).toHaveBeenCalledWith({ q: 1 });
      expect(mock.services.workflows.findById).toHaveBeenCalledWith(1, {
        populate: WORKFLOW_POPULATE,
      });
      expect(mock.permissionChecker.sanitizeUpdateInput).toHaveBeenCalledWith(existing);
      expect(mock.services.workflows.update).toHaveBeenCalledWith(existing, {
        data: { contentTypes: [ARTICLE_UID], sanitizedInput: true },
        populate: 'update-populate',
      });
      expect(ctx.body).toEqual({ data: { output: workflowForAdmin } });
    });

    it('update rejects a content type without review workflows before reading', async () => {
      const ctx = createCtx({
        params: { id: 1 },
        request: { body: { data: { contentTypes: ['api::page.page'] } }, query: {} },
      });

      await expect(action('workflows.update')(ctx)).rejects.toMatchObject(
        validationErrorWith('Content type api::page.page does not have review workflow enabled')
      );
      expect(mock.services.workflows.findById).not.toHaveBeenCalled();
    });

    it('update answers not found for an unknown workflow', async () => {
      mock.services.workflows.findById.mockResolvedValue(null);
      const ctx = createCtx({ params: { id: 9 }, request: { body: { data: {} }, query: {} } });

      await action('workflows.update')(ctx);

      expect(ctx.notFound).toHaveBeenCalledTimes(1);
      expect(mock.services.workflows.update).not.toHaveBeenCalled();
    });

    it('delete removes the workflow', async () => {
      const existing = { id: 1 };
      mock.services.workflows.findById.mockResolvedValue(existing);
      mock.services.workflows.delete.mockResolvedValue(workflowRow);
      const ctx = createCtx({ params: { id: 1 }, request: { query: { q: 1 } } });

      await action('workflows.delete')(ctx);

      expect(mock.permissionChecker.sanitizedQuery.delete).toHaveBeenCalledWith({ q: 1 });
      expect(mock.services.workflows.findById).toHaveBeenCalledWith(1, {
        populate: WORKFLOW_POPULATE,
      });
      expect(mock.services.workflows.delete).toHaveBeenCalledWith(existing, {
        populate: 'delete-populate',
      });
      expect(ctx.body).toEqual({ data: { output: workflowForAdmin } });
    });

    it('delete answers not found for an unknown workflow', async () => {
      mock.services.workflows.findById.mockResolvedValue(null);
      const ctx = createCtx({ params: { id: 9 }, request: { query: {} } });

      await action('workflows.delete')(ctx);

      expect(ctx.notFound).toHaveBeenCalledWith("Workflow doesn't exist");
      expect(mock.services.workflows.delete).not.toHaveBeenCalled();
    });

    it('find lists the workflows with their count', async () => {
      mock.services.workflows.find.mockResolvedValue([workflowRow]);
      const ctx = createCtx({ request: { query: { q: 1 } } });

      await action('workflows.find')(ctx);

      expect(mock.permissionChecker.sanitizedQuery.read).toHaveBeenCalledWith({ q: 1 });
      expect(mock.services.workflows.find).toHaveBeenCalledWith({
        populate: 'read-populate',
        filters: 'filters',
        sort: 'sort',
      });
      expect(ctx.body).toEqual({
        data: [{ output: workflowForAdmin }],
        meta: { workflowCount: 2 },
      });
    });
  });

  describe('stages', () => {
    it('find lists the stages of a workflow', async () => {
      mock.services.stages.find.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const ctx = createCtx({ params: { workflow_id: 5 }, query: { populate: 'p' } });

      await action('stages.find')(ctx);

      expect(mock.permissionCheckerService.create).toHaveBeenCalledWith({
        userAbility,
        model: STAGE_MODEL_UID,
      });
      expect(mock.services.stages.find).toHaveBeenCalledWith({ workflowId: 5, populate: 'p' });
      expect(ctx.body).toEqual({ data: [{ output: { id: 1 } }, { output: { id: 2 } }] });
    });

    it('findById reads one stage of a workflow', async () => {
      mock.services.stages.findById.mockResolvedValue({ id: 1 });
      const ctx = createCtx({ params: { id: 1, workflow_id: 5 }, query: { populate: 'p' } });

      await action('stages.findById')(ctx);

      expect(mock.services.stages.findById).toHaveBeenCalledWith(1, {
        workflowId: 5,
        populate: 'p',
      });
      expect(ctx.body).toEqual({ data: { output: { id: 1 } } });
    });

    describe('updateEntity', () => {
      const entity = { id: 1, documentId: 'doc', [ENTITY_STAGE_ATTRIBUTE]: { id: 1 } };
      const updateCtx = () =>
        createCtx({
          params: { model_uid: ARTICLE_UID, id: 'doc' },
          request: { body: { data: { id: '2' } }, query: { locale: 'fr' } },
        });

      it('moves the entity to the requested stage', async () => {
        mock.findOne.mockResolvedValue(entity);
        mock.services.stages.updateEntity.mockResolvedValue({ id: 1, updated: true });
        const ctx = updateCtx();

        await action('stages.updateEntity')(ctx);

        expect(mock.permissionCheckerService.create).toHaveBeenCalledWith({
          userAbility,
          model: ARTICLE_UID,
        });
        expect(mock.strapi.documents).toHaveBeenCalledWith(ARTICLE_UID);
        expect(mock.findOne).toHaveBeenCalledWith({
          documentId: 'doc',
          locale: 'fr',
          populate: [ENTITY_STAGE_ATTRIBUTE],
        });
        const stagePermissions = mock.services['stage-permissions'];
        expect(stagePermissions.can).toHaveBeenCalledWith(STAGE_TRANSITION_UID, 1);
        expect(mock.services.workflows.assertContentTypeBelongsToWorkflow).toHaveBeenCalledWith(
          ARTICLE_UID
        );
        expect(mock.services.workflows.assertStageBelongsToWorkflow).toHaveBeenCalledWith(2, {
          id: 'assigned-workflow',
        });
        expect(stagePermissions.canTransitionToStage).toHaveBeenCalledWith(2);
        expect(mock.services.stages.updateEntity).toHaveBeenCalledWith(entity, ARTICLE_UID, 2);
        expect(ctx.body).toEqual({ data: { output: { id: 1, updated: true } } });
      });

      it('answers 404 when the entity does not exist', async () => {
        mock.findOne.mockResolvedValue(null);

        await expect(action('stages.updateEntity')(updateCtx())).rejects.toMatchObject({
          status: 404,
          message: 'Entity not found',
        });
        expect(mock.services.stages.updateEntity).not.toHaveBeenCalled();
      });

      it('answers 403 when the user cannot move the entity out of its stage', async () => {
        mock.findOne.mockResolvedValue(entity);
        mock.services['stage-permissions'].can.mockReturnValue(false);

        await expect(action('stages.updateEntity')(updateCtx())).rejects.toMatchObject({
          status: 403,
          message: 'Forbidden stage transition',
        });
        expect(mock.services.stages.updateEntity).not.toHaveBeenCalled();
      });

      it('answers 403 when the user cannot move the entity to the requested stage', async () => {
        mock.findOne.mockResolvedValue(entity);
        mock.services['stage-permissions'].canTransitionToStage.mockResolvedValue(false);

        await expect(action('stages.updateEntity')(updateCtx())).rejects.toMatchObject({
          status: 403,
          message: 'Forbidden stage transition',
        });
        expect(mock.services.stages.updateEntity).not.toHaveBeenCalled();
      });
    });

    describe('listAvailableStages', () => {
      const listCtx = () =>
        createCtx({
          params: { model_uid: ARTICLE_UID, id: 'doc' },
          request: { query: {} },
        });
      const stages = [{ id: 1 }, { id: 2 }, { id: 3 }];

      it('lists the other stages the user can move the entity to', async () => {
        mock.findOne.mockResolvedValue({ id: 1, [ENTITY_STAGE_ATTRIBUTE]: { id: 1 } });
        mock.services.workflows.getAssignedWorkflow.mockResolvedValue({ stages });
        const stagePermissions = mock.services['stage-permissions'];
        stagePermissions.canTransitionToStageWithPermissions.mockImplementation(
          (stage: { id: number }) => stage.id === 3
        );
        const ctx = listCtx();

        await action('stages.listAvailableStages')(ctx);

        expect(mock.permissionCheckerService.create).toHaveBeenCalledWith({
          userAbility,
          model: ARTICLE_UID,
        });
        expect(mock.findOne).toHaveBeenCalledWith({
          documentId: 'doc',
          locale: undefined,
          populate: [ENTITY_STAGE_ATTRIBUTE],
        });
        expect(mock.services.workflows.getAssignedWorkflow).toHaveBeenCalledWith(ARTICLE_UID, {
          populate: { stages: { populate: { permissions: { populate: ['role'] } } } },
        });
        expect(stagePermissions.can).toHaveBeenCalledWith(STAGE_TRANSITION_UID, 1);
        expect(ctx.body).toEqual({
          data: [{ id: 3 }],
          meta: { stageCount: 3, workflowCount: 2, canTransition: true },
        });
      });

      it('answers forbidden when the user cannot read the content type', async () => {
        mock.permissionChecker.cannot.read.mockReturnValue(true);
        const ctx = listCtx();

        await action('stages.listAvailableStages')(ctx);

        expect(ctx.forbidden).toHaveBeenCalledTimes(1);
        expect(mock.strapi.documents).not.toHaveBeenCalled();
      });

      it('lists nothing when the user cannot move the entity out of its stage', async () => {
        mock.findOne.mockResolvedValue({ id: 1, [ENTITY_STAGE_ATTRIBUTE]: { id: 1 } });
        mock.services.workflows.getAssignedWorkflow.mockResolvedValue({ stages });
        mock.services['stage-permissions'].can.mockReturnValue(false);
        const ctx = listCtx();

        await action('stages.listAvailableStages')(ctx);

        expect(ctx.body).toEqual({
          data: [],
          meta: { stageCount: 3, workflowCount: 2, canTransition: false },
        });
      });

      it('lists nothing for an entity missing in the locale of an assigned workflow', async () => {
        mock.findOne.mockResolvedValue(null);
        mock.services.workflows.getAssignedWorkflow.mockResolvedValue({ stages });
        const ctx = listCtx();

        await action('stages.listAvailableStages')(ctx);

        expect(ctx.body).toEqual({
          data: [],
          meta: { stageCount: 3, workflowCount: 2, canTransition: true },
        });
      });

      it('answers 404 for a missing entity without assigned workflow', async () => {
        mock.findOne.mockResolvedValue(null);
        mock.services.workflows.getAssignedWorkflow.mockResolvedValue(null);

        await expect(action('stages.listAvailableStages')(listCtx())).rejects.toMatchObject({
          status: 404,
          message: 'Entity not found',
        });
      });
    });
  });

  describe('assignees', () => {
    const entity = { id: 1, documentId: 'doc', [ENTITY_STAGE_ATTRIBUTE]: { id: 4 } };
    const assigneeCtx = () =>
      createCtx({
        params: { model_uid: ARTICLE_UID, id: 'doc' },
        request: { body: { data: { id: 5 } }, query: { locale: 'fr' } },
      });

    it('updateEntity assigns the user to the entity', async () => {
      mock.findOne.mockResolvedValue(entity);
      mock.services.assignees.updateEntityAssignee.mockResolvedValue({ id: 1, assigned: true });
      const ctx = assigneeCtx();

      await action('assignees.updateEntity')(ctx);

      expect(mock.permissionCheckerService.create).toHaveBeenCalledWith({
        userAbility,
        model: ARTICLE_UID,
      });
      expect(mock.findOne).toHaveBeenCalledWith({
        documentId: 'doc',
        locale: 'fr',
        populate: [ENTITY_STAGE_ATTRIBUTE],
      });
      expect(mock.services['stage-permissions'].can).toHaveBeenCalledWith(STAGE_TRANSITION_UID, 4);
      expect(mock.services.workflows.assertContentTypeBelongsToWorkflow).toHaveBeenCalledWith(
        ARTICLE_UID
      );
      expect(mock.services.assignees.updateEntityAssignee).toHaveBeenCalledWith(
        entity,
        ARTICLE_UID,
        5
      );
      expect(ctx.body).toEqual({ data: { output: { id: 1, assigned: true } } });
    });

    it('updateEntity answers 404 when the entity does not exist', async () => {
      mock.findOne.mockResolvedValue(null);

      await expect(action('assignees.updateEntity')(assigneeCtx())).rejects.toMatchObject({
        status: 404,
        message: 'Entity not found',
      });
      expect(mock.services.assignees.updateEntityAssignee).not.toHaveBeenCalled();
    });

    it('updateEntity answers 403 without the stage transition permission', async () => {
      mock.findOne.mockResolvedValue(entity);
      mock.services['stage-permissions'].can.mockReturnValue(false);

      await expect(action('assignees.updateEntity')(assigneeCtx())).rejects.toMatchObject({
        status: 403,
        message: 'Stage transition permission is required',
      });
      expect(mock.services.assignees.updateEntityAssignee).not.toHaveBeenCalled();
    });
  });

  describe('homepage', () => {
    it('getRecentlyAssignedDocuments returns the homepage service documents', async () => {
      mock.services.homepage.getRecentlyAssignedDocuments.mockResolvedValue([{ id: 1 }]);

      await expect(action('homepage.getRecentlyAssignedDocuments')(createCtx())).resolves.toEqual({
        data: [{ id: 1 }],
      });
    });
  });
});
