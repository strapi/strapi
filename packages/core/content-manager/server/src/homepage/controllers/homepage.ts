import type { Core } from '@strapi/types';
import * as yup from 'yup';
import { errors } from '@strapi/utils';
import type { GetRecentDocuments, GetCountDocuments } from '../../../../shared/contracts/homepage';

const createHomepageController = () => {
  const homepageService = strapi.plugin('content-manager').service('homepage');

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
    async getCountDocuments(): Promise<GetCountDocuments.Response> {
      return { data: await homepageService.getCountDocuments() };
    },
  } satisfies Core.Controller;
};

export { createHomepageController };
