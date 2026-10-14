/**
 * Pins the document service middlewares registered at bootstrap. The service is resolved like the
 * core service registry does (`factory({ strapi })`), and the same mock is stubbed as the global
 * `strapi`, so these tests hold whether the code reads the injected instance or the global one.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ENTITY_STAGE_ATTRIBUTE } from '../../constants/workflows';
import documentServiceMiddlewares from '../document-service-middleware';

type Factory = (params: { strapi: unknown }) => unknown;
type MiddlewareCtx = {
  action: string;
  uid: string;
  contentType: { uid: string };
  params: { documentId?: string; locale?: string; data?: Record<string, unknown> };
};
type Middleware = (ctx: MiddlewareCtx, next: () => Promise<unknown>) => Promise<unknown>;
type Middlewares = {
  assignStageOnCreate: Middleware;
  handleStageOnUpdate: Middleware;
  checkStageBeforePublish: Middleware;
};

const UID = 'api::article.article';

const createStrapiMock = () => {
  const workflows = { getAssignedWorkflow: vi.fn() };
  const findOne = vi.fn();

  const strapi = {
    plugin: vi.fn((name: string) => ({
      service(serviceName: string) {
        if (name === 'review-workflows' && serviceName === 'workflows') {
          return workflows;
        }
        throw new Error(`Unexpected service ${name}.${serviceName}`);
      },
    })),
    documents: vi.fn(() => ({ findOne })),
    getModel: vi.fn(() => ({ modelName: 'article', uid: UID })),
    eventHub: { emit: vi.fn() },
  };

  return { strapi, workflows, findOne };
};

const createCtx = (action: string, params: MiddlewareCtx['params'] = {}): MiddlewareCtx => ({
  action,
  uid: UID,
  contentType: { uid: UID },
  params,
});

describe('review-workflows document service middlewares', () => {
  let mock: ReturnType<typeof createStrapiMock>;
  let middlewares: Middlewares;

  beforeEach(() => {
    mock = createStrapiMock();
    vi.stubGlobal('strapi', mock.strapi);
    middlewares = (documentServiceMiddlewares as unknown as Factory)({
      strapi: mock.strapi,
    }) as Middlewares;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('assignStageOnCreate', () => {
    it.each(['create', 'clone'])(
      'assigns the first stage of the workflow on %s',
      async (action) => {
        mock.workflows.getAssignedWorkflow.mockResolvedValue({ stages: [{ id: 7 }, { id: 8 }] });
        const ctx = createCtx(action, { data: { title: 'A' } });
        const next = vi.fn(async () => 'result');

        await expect(middlewares.assignStageOnCreate(ctx, next)).resolves.toBe('result');

        expect(mock.workflows.getAssignedWorkflow).toHaveBeenCalledWith(UID, {
          populate: 'stages',
        });
        expect(ctx.params.data).toEqual({ title: 'A', [ENTITY_STAGE_ATTRIBUTE]: { id: 7 } });
        expect(next).toHaveBeenCalledTimes(1);
      }
    );

    it('keeps a stage given by the caller', async () => {
      mock.workflows.getAssignedWorkflow.mockResolvedValue({ stages: [{ id: 7 }] });
      const ctx = createCtx('create', { data: { [ENTITY_STAGE_ATTRIBUTE]: { id: 8 } } });

      await middlewares.assignStageOnCreate(ctx, vi.fn());

      expect(ctx.params.data).toEqual({ [ENTITY_STAGE_ATTRIBUTE]: { id: 8 } });
    });

    it('leaves the data untouched when no workflow is assigned', async () => {
      mock.workflows.getAssignedWorkflow.mockResolvedValue(null);
      const ctx = createCtx('create', { data: { title: 'A' } });
      const next = vi.fn();

      await middlewares.assignStageOnCreate(ctx, next);

      expect(ctx.params.data).toEqual({ title: 'A' });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('ignores other actions', async () => {
      const next = vi.fn();

      await middlewares.assignStageOnCreate(createCtx('update', { data: {} }), next);

      expect(mock.workflows.getAssignedWorkflow).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleStageOnUpdate', () => {
    const previousStage = { id: 1, name: 'To do', workflow: { id: 3 } };

    it('emits the stage change of an updated entry', async () => {
      mock.findOne.mockResolvedValue({ [ENTITY_STAGE_ATTRIBUTE]: previousStage });
      const ctx = createCtx('update', {
        documentId: 'doc',
        locale: 'fr',
        data: { [ENTITY_STAGE_ATTRIBUTE]: 2 },
      });
      const result = { id: 5, locale: 'fr', [ENTITY_STAGE_ATTRIBUTE]: { id: 2, name: 'Done' } };
      const next = vi.fn(async () => result);

      await expect(middlewares.handleStageOnUpdate(ctx, next)).resolves.toBe(result);

      expect(mock.strapi.documents).toHaveBeenCalledWith(UID);
      expect(mock.findOne).toHaveBeenCalledWith({
        ...ctx.params,
        documentId: 'doc',
        status: 'draft',
        populate: { [ENTITY_STAGE_ATTRIBUTE]: { populate: { workflow: true } } },
      });
      expect(mock.strapi.getModel).toHaveBeenCalledWith(UID);
      expect(mock.strapi.eventHub.emit).toHaveBeenCalledWith('review-workflows.updateEntryStage', {
        model: 'article',
        uid: UID,
        entity: { id: 5, documentId: 'doc', locale: 'fr', status: 'draft' },
        workflow: {
          id: 3,
          stages: { from: { id: 1, name: 'To do' }, to: { id: 2, name: 'Done' } },
        },
      });
      // Current behaviour: `next` runs once for the update, then once more for the return value
      expect(next).toHaveBeenCalledTimes(2);
    });

    it('does not emit when the stage did not change', async () => {
      mock.findOne.mockResolvedValue({ [ENTITY_STAGE_ATTRIBUTE]: previousStage });
      const ctx = createCtx('update', { documentId: 'doc', data: { [ENTITY_STAGE_ATTRIBUTE]: 1 } });
      const next = vi.fn(async () => ({ id: 5, [ENTITY_STAGE_ATTRIBUTE]: { id: 1 } }));

      await middlewares.handleStageOnUpdate(ctx, next);

      expect(mock.strapi.eventHub.emit).not.toHaveBeenCalled();
    });

    it('returns an empty update result without emitting', async () => {
      mock.findOne.mockResolvedValue({ [ENTITY_STAGE_ATTRIBUTE]: previousStage });
      const ctx = createCtx('update', { documentId: 'doc', data: { [ENTITY_STAGE_ATTRIBUTE]: 2 } });
      const next = vi.fn(async () => null);

      await expect(middlewares.handleStageOnUpdate(ctx, next)).resolves.toBe(null);

      expect(next).toHaveBeenCalledTimes(1);
      expect(mock.strapi.eventHub.emit).not.toHaveBeenCalled();
    });

    it('drops an empty stage from the data without reading the entry', async () => {
      const ctx = createCtx('update', {
        documentId: 'doc',
        data: { title: 'A', [ENTITY_STAGE_ATTRIBUTE]: null },
      });
      const next = vi.fn();

      await middlewares.handleStageOnUpdate(ctx, next);

      expect(ctx.params.data).toEqual({ title: 'A' });
      expect(mock.strapi.documents).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('ignores other actions', async () => {
      const next = vi.fn();

      await middlewares.handleStageOnUpdate(createCtx('create', { data: {} }), next);

      expect(mock.strapi.documents).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkStageBeforePublish', () => {
    it('publishes an entry at the required stage', async () => {
      mock.workflows.getAssignedWorkflow.mockResolvedValue({ stageRequiredToPublish: { id: 2 } });
      mock.findOne.mockResolvedValue({ [ENTITY_STAGE_ATTRIBUTE]: { id: 2 } });
      const ctx = createCtx('publish', { documentId: 'doc' });
      const next = vi.fn(async () => 'published');

      await expect(middlewares.checkStageBeforePublish(ctx, next)).resolves.toBe('published');

      expect(mock.workflows.getAssignedWorkflow).toHaveBeenCalledWith(UID, {
        populate: 'stageRequiredToPublish',
      });
      expect(mock.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: 'doc', status: 'draft' })
      );
    });

    it('rejects an entry that is not at the required stage', async () => {
      mock.workflows.getAssignedWorkflow.mockResolvedValue({ stageRequiredToPublish: { id: 2 } });
      mock.findOne.mockResolvedValue({ [ENTITY_STAGE_ATTRIBUTE]: { id: 1 } });
      const next = vi.fn();

      await expect(
        middlewares.checkStageBeforePublish(createCtx('publish', { documentId: 'doc' }), next)
      ).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'Entry is not at the required stage to publish',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it.each([null, { stageRequiredToPublish: null }])(
      'publishes without a required stage (workflow: %j)',
      async (workflow) => {
        mock.workflows.getAssignedWorkflow.mockResolvedValue(workflow);
        const next = vi.fn();

        await middlewares.checkStageBeforePublish(
          createCtx('publish', { documentId: 'doc' }),
          next
        );

        expect(mock.findOne).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(1);
      }
    );

    it('ignores other actions', async () => {
      const next = vi.fn();

      await middlewares.checkStageBeforePublish(createCtx('update'), next);

      expect(mock.workflows.getAssignedWorkflow).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
