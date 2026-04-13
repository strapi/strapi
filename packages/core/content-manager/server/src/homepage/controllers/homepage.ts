import type { Core } from '@strapi/types';
import { z, errors } from '@strapi/utils';
import type { GetRecentDocuments, GetCountDocuments } from '../../../../shared/contracts/homepage';

const createHomepageController = () => {
  const homepageService = strapi.plugin('content-manager').service('homepage');

  const recentDocumentParamsSchema = z.object({
    action: z.enum(['update', 'publish']),
  });

  return {
    async getRecentDocuments(ctx): Promise<GetRecentDocuments.Response> {
      let action;

      try {
        action = recentDocumentParamsSchema.parse(ctx.query).action;
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new errors.ValidationError(error.issues[0]?.message ?? 'Validation error');
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
