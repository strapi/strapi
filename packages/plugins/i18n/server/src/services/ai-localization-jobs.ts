import type { Core } from '@strapi/types';
import { AI_LOCALIZATION_JOBS_UID } from '../models/ai-localization-jobs';
import type { AILocalizationJobs } from '../../../shared/contracts/ai-localization-jobs';

export const createAILocalizationJobsService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Create a new AI localizations job or update an existing one for a document
   * Ensures only one job exists per document
   */
  async upsertJobForDocument({
    documentId,
    contentType,
    sourceLocale,
    targetLocales,
    status = 'processing',
  }: {
    documentId: string;
    contentType: string;
    sourceLocale: string;
    targetLocales: string[];
    status?: AILocalizationJobs['status'];
  }) {
    // Check if job already exists for this document
    const existingJob = await strapi.db.query(AI_LOCALIZATION_JOBS_UID).findOne({
      where: {
        relatedDocumentId: documentId,
      },
    });

    if (existingJob) {
      strapi.log.info(
        `[AI Localizations Job] Updated existing job for document ${documentId} with status: ${status}`
      );
      // Update existing job with new data and status
      return strapi.db.query(AI_LOCALIZATION_JOBS_UID).update({
        where: { id: existingJob.id },
        data: {
          contentType,
          sourceLocale,
          targetLocales,
          status,
          updatedAt: new Date(),
        },
      });
    }

    strapi.log.info(
      `[AI Localizations Job] Created new job for document ${documentId} with status: ${status}`
    );
    // Create new AI localizations job
    return strapi.db.query(AI_LOCALIZATION_JOBS_UID).create({
      data: {
        contentType,
        relatedDocumentId: documentId,
        sourceLocale,
        targetLocales,
        status,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  },

  /**
   * Get job by document ID
   */
  async getJobByDocument(documentId: string) {
    return strapi.db.query(AI_LOCALIZATION_JOBS_UID).findOne({
      where: {
        relatedDocumentId: documentId,
      },
    });
  },
});
