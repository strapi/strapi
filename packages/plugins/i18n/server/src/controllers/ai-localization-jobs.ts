import type { Core } from '@strapi/types';

const createAILocalizationJobsController = ({ strapi }: { strapi: Core.Strapi }) => {
  const getService = (name: string) => strapi.plugin('i18n').service(name);
  const aiLocalizationJobsService = getService('ai-localization-jobs');

  return {
    /**
     * Get a job for a singleType using the contentType
     * There is only 1 job per contentType
     */
    async getJobForSingleType(ctx: any) {
      const { contentType } = ctx.params;

      if (!contentType) {
        return ctx.badRequest('contentType is required');
      }

      try {
        const job = await aiLocalizationJobsService.getJobByContentType(contentType);

        ctx.body = {
          data: job,
        };
      } catch (error) {
        strapi.log.error('[AI Localizations Jobs] Error fetching job:', error);
        ctx.internalServerError('Failed to fetch AI localizations job');
      }
    },
    /**
     * Get a job for a collectionType using the documentId
     * There is only 1 job per documentId
     */
    async getJobForCollectionType(ctx: any) {
      const { documentId, contentType } = ctx.params;

      if (!documentId || !contentType) {
        return ctx.badRequest('Document ID and contentType are required');
      }

      try {
        const job = await aiLocalizationJobsService.getJobByDocument(contentType, documentId);

        ctx.body = {
          data: job,
        };
      } catch (error) {
        strapi.log.error('[AI Localizations Jobs] Error fetching job:', error);
        ctx.internalServerError('Failed to fetch AI localizations job');
      }
    },
  };
};

export default createAILocalizationJobsController;
