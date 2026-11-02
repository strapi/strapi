import type { Core } from '@strapi/types';
import { describe, expect, it, vi } from 'vitest';

import stagesFactory from '../stages';
import { STAGE_MODEL_UID } from '../../constants/workflows';

vi.mock('../../utils', () => ({
  getService: vi.fn((name: string) => {
    if (name === 'validation') {
      return { validateWorkflowCount: vi.fn() };
    }
    if (name === 'workflow-metrics') {
      return {
        sendDidCreateStage: vi.fn(),
        sendDidEditStage: vi.fn(),
        sendDidDeleteStage: vi.fn(),
      };
    }
    if (name === 'stage-permissions') {
      return { unregister: vi.fn() };
    }
    return {};
  }),
}));

const productUID = 'api::product.product';
const srcStages = [
  { id: 1, name: 'To do', permissions: [] },
  { id: 2, name: 'Done', permissions: [] },
];
const destStages = [{ id: 1, name: 'To do' }];

const createReplaceStagesStrapiMock = (events: string[]) => {
  const dbQuery = {
    delete: vi.fn(async () => {
      events.push('stage:delete');
      return { id: 2 };
    }),
  };

  return {
    db: {
      query: vi.fn(() => dbQuery),
      transaction: vi.fn(async (work: (args: { trx: unknown }) => Promise<unknown>) => {
        const result = await work({ trx: {} });
        events.push('transaction:commit');
        return result;
      }),
    },
  } as unknown as Core.Strapi;
};

const createFindByIdStrapiMock = () => {
  const dbQuery = {
    findOne: vi.fn().mockResolvedValue(null),
  };

  const strapi = {
    db: {
      query: vi.fn<(uid: string) => typeof dbQuery>(() => dbQuery),
    },
  };

  return { strapi, dbQuery };
};

const orphanUID = 'api::orphan.orphan';
const noStageUID = 'api::no-stage.no-stage';

// `orphanUID` has no model anymore, `noStageUID` has a model without a stage attribute
const createEntitiesStageStrapiMock = () => {
  const deleteLinks = vi.fn();
  const models: Record<string, { tableName: string; attributes: Record<string, unknown> }> = {
    [productUID]: {
      tableName: 'products',
      attributes: { strapi_stage: { joinTable: { name: 'products_strapi_stage_lnk' } } },
    },
    [noStageUID]: { tableName: 'no_stages', attributes: {} },
  };

  const strapi = {
    db: {
      metadata: {
        has: vi.fn((uid: string) => uid in models),
        get: vi.fn((uid: string) => {
          if (uid in models) {
            return models[uid];
          }
          throw new Error(`Metadata for "${uid}" not found`);
        }),
      },
      getConnection: vi.fn(() => ({
        from: vi.fn(() => ({ delete: vi.fn(() => ({ transacting: deleteLinks })) })),
      })),
      transaction: vi.fn(async (work: (args: { trx: unknown }) => Promise<unknown>) =>
        work({ trx: {} })
      ),
    },
  } as unknown as Core.Strapi;

  return { strapi, deleteLinks };
};

describe('review-workflows stages service', () => {
  describe('replaceStages', () => {
    it('moves the entities of a deleted stage before the stage is deleted and the transaction ends', async () => {
      const events: string[] = [];
      const stagesService = stagesFactory({ strapi: createReplaceStagesStrapiMock(events) });

      const updateEntitiesStage = vi
        .spyOn(stagesService, 'updateEntitiesStage')
        .mockImplementation(async () => {
          // Let the database query take some time
          await new Promise((resolve) => {
            setTimeout(resolve, 10);
          });
          events.push('entities:move');
          // Number of moved entities
          return 1;
        });

      await stagesService.replaceStages(srcStages, destStages, [productUID] as never);

      expect(events).toEqual(['entities:move', 'stage:delete', 'transaction:commit']);
      expect(updateEntitiesStage).toHaveBeenCalledWith(productUID, {
        fromStageId: 2,
        toStageId: 1,
      });
    });

    it('rejects when the entities of a deleted stage cannot be moved', async () => {
      const events: string[] = [];
      const stagesService = stagesFactory({ strapi: createReplaceStagesStrapiMock(events) });

      vi.spyOn(stagesService, 'updateEntitiesStage').mockRejectedValue(new Error('move failed'));

      await expect(
        stagesService.replaceStages(srcStages, destStages, [productUID] as never)
      ).rejects.toThrow('move failed');
      expect(events).not.toContain('transaction:commit');
    });
  });

  describe('updateEntitiesStage', () => {
    it.each([
      ['no longer exists', orphanUID],
      ['has no stage attribute', noStageUID],
    ])('does nothing for a content type that %s', async (_, contentTypeUID) => {
      const { strapi } = createEntitiesStageStrapiMock();
      const stagesService = stagesFactory({ strapi });

      await expect(
        stagesService.updateEntitiesStage(contentTypeUID, { fromStageId: 2, toStageId: 1 })
      ).resolves.toBeUndefined();
      expect(strapi.db.transaction).not.toHaveBeenCalled();
    });

    it('lets a deleted stage be removed while the workflow still lists a content type that no longer exists', async () => {
      const events: string[] = [];
      const strapi = createReplaceStagesStrapiMock(events);
      const { strapi: entitiesStageStrapi } = createEntitiesStageStrapiMock();
      Object.assign(strapi.db, { metadata: entitiesStageStrapi.db.metadata });
      const stagesService = stagesFactory({ strapi });

      await stagesService.replaceStages(srcStages, destStages, [orphanUID] as never);

      expect(events).toEqual(['stage:delete', 'transaction:commit']);
    });
  });

  describe('deleteAllEntitiesStage', () => {
    it('deletes the stage links of a content type', async () => {
      const { strapi, deleteLinks } = createEntitiesStageStrapiMock();
      const stagesService = stagesFactory({ strapi });

      await stagesService.deleteAllEntitiesStage(productUID);

      expect(deleteLinks).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['no longer exists', orphanUID],
      ['has no stage attribute', noStageUID],
    ])('does nothing for a content type that %s', async (_, contentTypeUID) => {
      const { strapi, deleteLinks } = createEntitiesStageStrapiMock();
      const stagesService = stagesFactory({ strapi });

      await expect(stagesService.deleteAllEntitiesStage(contentTypeUID)).resolves.toBeUndefined();
      expect(deleteLinks).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('only matches a stage of the given workflow', async () => {
      const { strapi, dbQuery } = createFindByIdStrapiMock();
      const service = stagesFactory({ strapi: strapi as unknown as Core.Strapi });

      await service.findById(10, { workflowId: 1 });

      expect(strapi.db.query).toHaveBeenCalledWith(STAGE_MODEL_UID);
      expect(dbQuery.findOne).toHaveBeenCalledWith({
        where: { id: 10, workflow: 1 },
        populate: undefined,
      });
    });

    it('matches a stage of any workflow when no workflow is given', async () => {
      const { strapi, dbQuery } = createFindByIdStrapiMock();
      const service = stagesFactory({ strapi: strapi as unknown as Core.Strapi });

      await service.findById(10);

      expect(dbQuery.findOne).toHaveBeenCalledWith({
        where: { id: 10 },
        populate: undefined,
      });
    });
  });
});
