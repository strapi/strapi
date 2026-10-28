import type { Core } from '@strapi/types';
import { describe, expect, it, vi } from 'vitest';

import stagesFactory from '../stages';
import { STAGE_MODEL_UID } from '../../constants/workflows';

vi.mock('../../utils', () => ({
  getService: vi.fn(() => ({})),
}));

const createStrapiMock = () => {
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

describe('review-workflows stages service', () => {
  describe('findById', () => {
    it('only matches a stage of the given workflow', async () => {
      const { strapi, dbQuery } = createStrapiMock();
      const service = stagesFactory({ strapi: strapi as unknown as Core.Strapi });

      await service.findById(10, { workflowId: 1 });

      expect(strapi.db.query).toHaveBeenCalledWith(STAGE_MODEL_UID);
      expect(dbQuery.findOne).toHaveBeenCalledWith({
        where: { id: 10, workflow: 1 },
        populate: undefined,
      });
    });

    it('matches a stage of any workflow when no workflow is given', async () => {
      const { strapi, dbQuery } = createStrapiMock();
      const service = stagesFactory({ strapi: strapi as unknown as Core.Strapi });

      await service.findById(10);

      expect(dbQuery.findOne).toHaveBeenCalledWith({
        where: { id: 10 },
        populate: undefined,
      });
    });
  });
});
