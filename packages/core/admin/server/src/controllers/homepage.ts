import type { Core } from '@strapi/types';
import * as yup from 'yup';
import { errors } from '@strapi/utils';
import { getService } from '../utils';
import type { GetRecentDocuments } from '../../../shared/contracts/homepage';

const createHomepageController = () => {
  const homepageService = getService('homepage');

  const recentDocumentParamsSchema = yup.object().shape({
    action: yup
      .mixed<GetRecentDocuments.Request['query']['action']>()
      .oneOf(['update', 'publish'])
      .required(),
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

      if (action === 'publish') {
        return { data: await homepageService.getRecentlyPublishedDocuments() };
      }

      return { data: await homepageService.getRecentlyUpdatedDocuments() };
    },
  } satisfies Core.Controller;
};

export { createHomepageController };
