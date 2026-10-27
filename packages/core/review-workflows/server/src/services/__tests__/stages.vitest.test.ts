import type { Core } from '@strapi/types';
import { describe, expect, it, vi } from 'vitest';
import stagesFactory from '../stages';

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

const createStrapiMock = (events: string[]) => {
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

describe('stages service', () => {
  describe('replaceStages', () => {
    it('moves the entities of a deleted stage before the stage is deleted and the transaction ends', async () => {
      const events: string[] = [];
      const stagesService = stagesFactory({ strapi: createStrapiMock(events) });

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
      const stagesService = stagesFactory({ strapi: createStrapiMock(events) });

      vi.spyOn(stagesService, 'updateEntitiesStage').mockRejectedValue(new Error('move failed'));

      await expect(
        stagesService.replaceStages(srcStages, destStages, [productUID] as never)
      ).rejects.toThrow('move failed');
      expect(events).not.toContain('transaction:commit');
    });
  });
});
