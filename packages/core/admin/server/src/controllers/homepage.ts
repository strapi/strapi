import type { Core } from '@strapi/types';
import * as yup from 'yup';
import { errors } from '@strapi/utils';
import { getService } from '../utils';
import type { GetRecentDocuments } from '../../../shared/contracts/homepage';

const createHomepageController = () => {
  const homepageService = getService('homepage');

  const recentDocumentParamsSchema = yup.object().shape({
    action: yup.mixed<GetRecentDocuments.Request['query']['action']>().oneOf(['update']).required(),
  });

  return {
    async getRecentDocuments(ctx): Promise<GetRecentDocuments.Response> {
      let action;

      try {
        action = (await recentDocumentParamsSchema.validate(ctx.query)).action;
      } catch (error) {
        if (error instanceof yup.ValidationError) {
          throw new errors.ValidationError(error.message);
        }
        throw error;
      }

      if (action === 'update') {
        return { data: await homepageService.getRecentUpdates() };
      }

      // Just making TS happy until we manage the other actions here
      return { data: [] };
    },
  } satisfies Core.Controller;
};

export { createHomepageController };
