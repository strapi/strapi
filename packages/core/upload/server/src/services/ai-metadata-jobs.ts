import type { Core } from '@strapi/types';

import { AIMetadataJob } from '../../../shared/contracts/ai-metadata-jobs';
import { AI_METADATA_JOB_UID } from '../models/ai-metadata-job';

export const createAIMetadataJobsService = ({ strapi }: { strapi: Core.Strapi }) => ({
  async createJob(totalFiles: number): Promise<number> {
    const job = await strapi.db.query(AI_METADATA_JOB_UID).create({
      data: {
        status: 'processing',
        totalFiles,
        processedFiles: 0,
        successCount: 0,
        errorCount: 0,
        errors: [],
        createdAt: new Date(),
      },
    });

    return job.id;
  },

  async getJob(jobId: number): Promise<AIMetadataJob | null> {
    return strapi.db.query(AI_METADATA_JOB_UID).findOne({
      where: { id: jobId },
    });
  },

  async updateJob(
    jobId: number,
    updates: Partial<Omit<AIMetadataJob, 'id' | 'createdAt'>>
  ): Promise<void> {
    await strapi.db.query(AI_METADATA_JOB_UID).update({
      where: { id: jobId },
      data: updates,
    });
  },

  async deleteJob(jobId: number): Promise<void> {
    await strapi.db.query(AI_METADATA_JOB_UID).delete({
      where: { id: jobId },
    });
  },

  async getLatestActiveJob(): Promise<AIMetadataJob | null> {
    // Return the most recent job, regardless of status
    // This allows the frontend to see completed/failed status
    return strapi.db.query(AI_METADATA_JOB_UID).findOne({
      orderBy: { createdAt: 'desc' },
    });
  },

  async cleanupOldJobs(): Promise<number> {
    const oldJobs = await strapi.db.query(AI_METADATA_JOB_UID).findMany({
      where: {
        status: { $ne: 'processing' },
      },
    });

    for (const job of oldJobs) {
      await this.deleteJob(job.id);
    }

    return oldJobs.length;
  },

  async registerCron() {
    strapi.cron.add({
      aiMetadataJobsCleanup: {
        task: async () => {
          try {
            const deletedCount = await this.cleanupOldJobs();
            if (deletedCount > 0) {
              strapi.log.info(`Cleaned up ${deletedCount} old AI metadata jobs`);
            }
          } catch (error) {
            strapi.log.error('Failed to cleanup AI metadata jobs:', error);
          }
        },
        options: '0 0 * * *', // Run once a day at midnight
      },
    });
  },
});

export type { AIMetadataJob };
