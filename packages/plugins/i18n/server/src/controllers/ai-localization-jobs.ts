import type { Core } from '@strapi/types';

const createAILocalizationJobsController = ({ strapi }: { strapi: Core.Strapi }) => {
  const getService = (name: string) => strapi.plugin('i18n').service(name);

  return {
  /**
   * Get the current AI localizations job for a specific document
   * There should only be one job per document
   */
  async getJobByDocument(ctx: any) {
    const { documentId } = ctx.params;

    if (!documentId) {
      return ctx.badRequest('Document ID is required');
    }

    try {
      const aiLocalizationJobsService = getService('ai-localization-jobs');
      const job = await aiLocalizationJobsService.getJobByDocument(documentId);

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
