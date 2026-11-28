import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import documentServiceMiddlewareFactory from '../document-service-middleware';
import { ENTITY_STAGE_ATTRIBUTE } from '../../constants/workflows';
import { WORKFLOW_UPDATE_STAGE } from '../../constants/webhook-events';

const UID = 'api::article.article';

const workflow = { id: 1 };
const draftStage = { id: 10, name: 'Draft', workflow };
const reviewStage = { id: 11, name: 'Review', workflow };

const createStrapiMock = (previousStage: typeof draftStage) => {
  return {
    documents: vi.fn(() => ({
      findOne: vi.fn().mockResolvedValue({ [ENTITY_STAGE_ATTRIBUTE]: previousStage }),
    })),
    getModel: vi.fn(() => ({ modelName: 'article', uid: UID })),
    eventHub: { emit: vi.fn() },
  };
};

const localizedContentType = {
  uid: UID,
  attributes: { [ENTITY_STAGE_ATTRIBUTE]: {} },
  pluginOptions: { i18n: { localized: true } },
};

const createUpdateContext = (stageId: number) => ({
  action: 'update',
  contentType: { uid: UID },
  params: { documentId: 'doc-1', data: { [ENTITY_STAGE_ATTRIBUTE]: stageId } },
});

const createAssignStageStrapiMock = (existingEntry: { id: number } | null) => {
  const findOne = vi.fn().mockResolvedValue(existingEntry);
  const getAssignedWorkflow = vi.fn().mockResolvedValue({ ...workflow, stages: [draftStage] });

  return {
    findOne,
    getAssignedWorkflow,
    strapi: {
      documents: vi.fn(() => ({ findOne })),
      plugin: vi.fn(() => ({ service: vi.fn(() => ({ getAssignedWorkflow })) })),
    },
  };
};

describe('review-workflows document service middleware', () => {
  const { assignStageOnCreate, handleStageOnUpdate } = documentServiceMiddlewareFactory();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('assignStageOnCreate', () => {
    test('assigns the first stage of the workflow when an entry is created', async () => {
      const mock = createAssignStageStrapiMock(null);
      vi.stubGlobal('strapi', mock.strapi);

      const ctx = { action: 'create', contentType: { uid: UID }, params: { data: {} } };
      const next = vi.fn();

      await assignStageOnCreate(ctx as any, next);

      expect(ctx.params.data).toEqual({ [ENTITY_STAGE_ATTRIBUTE]: { id: draftStage.id } });
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('assigns the first stage of the workflow when an update creates a new locale', async () => {
      const mock = createAssignStageStrapiMock(null);
      vi.stubGlobal('strapi', mock.strapi);

      const ctx = {
        action: 'update',
        contentType: localizedContentType,
        params: { documentId: 'doc-1', locale: 'fr', data: {} },
      };
      const next = vi.fn();

      await assignStageOnCreate(ctx as any, next);

      expect(mock.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: 'doc-1', locale: 'fr', status: 'draft' })
      );
      expect(ctx.params.data).toEqual({ [ENTITY_STAGE_ATTRIBUTE]: { id: draftStage.id } });
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('does not change the stage when an update targets an existing locale', async () => {
      const mock = createAssignStageStrapiMock({ id: 1 });
      vi.stubGlobal('strapi', mock.strapi);

      const ctx = {
        action: 'update',
        contentType: localizedContentType,
        params: { documentId: 'doc-1', locale: 'en', data: {} },
      };
      const next = vi.fn();

      await assignStageOnCreate(ctx as any, next);

      expect(ctx.params.data).toEqual({});
      expect(next).toHaveBeenCalledTimes(1);
    });
    test('keeps the stage sent by an update that creates a new locale', async () => {
      const mock = createAssignStageStrapiMock(null);
      vi.stubGlobal('strapi', mock.strapi);

      const ctx = {
        action: 'update',
        contentType: localizedContentType,
        params: { documentId: 'doc-1', locale: 'fr', data: { [ENTITY_STAGE_ATTRIBUTE]: 11 } },
      };
      const next = vi.fn();

      await assignStageOnCreate(ctx as any, next);

      expect(mock.findOne).not.toHaveBeenCalled();
      expect(ctx.params.data).toEqual({ [ENTITY_STAGE_ATTRIBUTE]: 11 });
      expect(next).toHaveBeenCalledTimes(1);
    });

    test.each([
      [
        'a non-localized type',
        { uid: UID, attributes: { [ENTITY_STAGE_ATTRIBUTE]: {} }, pluginOptions: {} },
      ],
      [
        'a type without a stage attribute',
        { uid: UID, attributes: {}, pluginOptions: { i18n: { localized: true } } },
      ],
    ])('does not look up the locale on an update of %s', async (_, contentType) => {
      const mock = createAssignStageStrapiMock(null);
      vi.stubGlobal('strapi', mock.strapi);

      const ctx = {
        action: 'update',
        contentType,
        params: { documentId: 'doc-1', locale: 'fr', data: {} },
      };
      const next = vi.fn();

      await assignStageOnCreate(ctx as any, next);

      expect(mock.findOne).not.toHaveBeenCalled();
      expect(mock.getAssignedWorkflow).not.toHaveBeenCalled();
      expect(ctx.params.data).toEqual({});
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleStageOnUpdate', () => {
    test('runs the update once and emits the stage change event once', async () => {
      const strapi = createStrapiMock(draftStage);
      vi.stubGlobal('strapi', strapi);

      const updatedEntry = { id: 1, locale: 'en', [ENTITY_STAGE_ATTRIBUTE]: reviewStage };
      const next = vi.fn().mockResolvedValue(updatedEntry);

      const result = await handleStageOnUpdate(createUpdateContext(reviewStage.id) as any, next);

      expect(result).toBe(updatedEntry);
      expect(next).toHaveBeenCalledTimes(1);
      expect(strapi.eventHub.emit).toHaveBeenCalledTimes(1);
      expect(strapi.eventHub.emit).toHaveBeenCalledWith(
        WORKFLOW_UPDATE_STAGE,
        expect.objectContaining({
          workflow: {
            id: workflow.id,
            stages: {
              from: { id: draftStage.id, name: draftStage.name },
              to: { id: reviewStage.id, name: reviewStage.name },
            },
          },
        })
      );
    });

    test('runs the update once when the stage does not change', async () => {
      const strapi = createStrapiMock(draftStage);
      vi.stubGlobal('strapi', strapi);

      const updatedEntry = { id: 1, locale: 'en', [ENTITY_STAGE_ATTRIBUTE]: draftStage };
      const next = vi.fn().mockResolvedValue(updatedEntry);

      const result = await handleStageOnUpdate(createUpdateContext(draftStage.id) as any, next);

      expect(result).toBe(updatedEntry);
      expect(next).toHaveBeenCalledTimes(1);
      expect(strapi.eventHub.emit).not.toHaveBeenCalled();
    });
  });
});
