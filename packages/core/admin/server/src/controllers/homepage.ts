import type { Core } from '@strapi/types';
import * as yup from 'yup';
import { errors } from '@strapi/utils';
import { getService } from '../utils';

const createHomepageController = () => {
  const homepageService = getService('homepage');

  const recentDocumentParamsSchema = yup.object().shape({
    action: yup.mixed<'update'>().oneOf(['update']).required(),
  });

  return {
    async getRecentDocuments(ctx) {
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
    },
  } satisfies Core.Controller;
};

export { createHomepageController };
