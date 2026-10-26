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

const createUpdateContext = (stageId: number) => ({
  action: 'update',
  contentType: { uid: UID },
  params: { documentId: 'doc-1', data: { [ENTITY_STAGE_ATTRIBUTE]: stageId } },
});

describe('review-workflows document service middleware', () => {
  const { handleStageOnUpdate } = documentServiceMiddlewareFactory();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
