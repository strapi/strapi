import type { Core } from '@strapi/types';
import { z } from 'zod';
import { InputFile, File } from '../types';
import { Settings } from '../controllers/validation/admin/settings';
import { getService } from '../utils';

const createAIMetadataService = ({ strapi }: { strapi: Core.Strapi }) => {
  const aiServerUrl = process.env.STRAPI_AI_URL || 'https://strapi-ai.apps.strapi.io';

  return {
    async isEnabled() {
      // Check if user disabled AI features globally
      const isAIEnabled = strapi.config.get('admin.ai.enabled', true);
      if (!isAIEnabled) {
        return false;
      }

      // Check if the user's license grants access to AI features
      const hasAccess = strapi.ee.features.isEnabled('cms-ai');
      if (!hasAccess) {
        return false;
      }

      // Check if feature is specifically enabled, defaulting to true
      const settings: Settings = await strapi.plugin('upload').service('upload').getSettings();
      const aiMetadata: boolean = settings.aiMetadata ?? true;

      return aiMetadata;
    },

    async countImagesWithoutMetadata() {
      const count = await strapi.db.query('plugin::upload.file').count({
        where: {
          mime: {
            $startsWith: 'image/',
          },
          $or: [
            { alternativeText: { $null: true } },
            { alternativeText: '' },
            { caption: { $null: true } },
            { caption: '' },
          ],
        },
      });

      return count;
    },

    /**
     * Update files with AI-generated metadata
     * Shared logic used by both upload flow and batch processing
     */
    async updateFilesWithAIMetadata(
      files: File[],
      metadataResults: Array<{ altText: string; caption: string } | null>,
      options?: {
        user?: { id: string | number };
      }
    ): Promise<{ processed: number; errors: Array<{ fileId: number; error: string }> }> {
      const uploadService = strapi.plugin('upload').service('upload');
      let processed = 0;
      const errors: Array<{ fileId: number; error: string }> = [];

      await Promise.all(
        files.map(async (file, index) => {
          const aiMetadata = metadataResults[index];
          if (aiMetadata) {
            try {
              // Only update fields that are missing (null or empty string)
              const updateData: { alternativeText?: string; caption?: string } = {};

              if (!file.alternativeText || file.alternativeText === '') {
                updateData.alternativeText = aiMetadata.altText;
              }

              if (!file.caption || file.caption === '') {
                updateData.caption = aiMetadata.caption;
              }

              // Only update if there are fields to update
              if (Object.keys(updateData).length > 0) {
                await uploadService.updateFileInfo(
                  file.id,
                  updateData,
                  options?.user ? { user: options.user } : undefined
                );

                // Update in-memory file object (needed for upload flow response)
                if (updateData.alternativeText !== undefined) {
                  file.alternativeText = updateData.alternativeText;
                }
                if (updateData.caption !== undefined) {
                  file.caption = updateData.caption;
                }

                processed += 1;
              }
            } catch (error) {
              errors.push({
                fileId: file.id,
                error: error instanceof Error ? error.message : 'Unknown error updating file',
              });
            }
          }
        })
      );

      return { processed, errors };
    },

    /**
     * Checks for images without metadata and generates metadata for them
     */
    async processExistingFiles() {
      if (!(await this.isEnabled())) {
        throw new Error('AI Metadata service is not enabled');
      }

      // Query all images without metadata
      const files: File[] = await strapi.db.query('plugin::upload.file').findMany({
        where: {
          mime: {
            $startsWith: 'image/',
          },
          $or: [
            { alternativeText: { $null: true } },
            { alternativeText: '' },
            { caption: { $null: true } },
            { caption: '' },
          ],
        },
      });

      if (files.length === 0) {
        strapi.log.info('No images without metadata found');
        return { processed: 0, errors: [] };
      }

      try {
        const metadataResults = await this.processFiles(files);
        const updatedImages = await this.updateFilesWithAIMetadata(files, metadataResults);

        return updatedImages;
      } catch (error) {
        strapi.log.error('AI metadata generation failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },

    /**
     * Process existing files with job tracking for progress updates
     */
    async processExistingFilesWithJob(jobId: string, user: { id: string | number }): Promise<void> {
      const jobService = getService('aiMetadataJobs');

      try {
        // Mark as processing
        jobService.updateJob(jobId, { status: 'processing' });

        // Query all images without metadata
        const files: File[] = await strapi.db.query('plugin::upload.file').findMany({
          where: {
            mime: {
              $startsWith: 'image/',
            },
            $or: [
              { alternativeText: { $null: true } },
              { alternativeText: '' },
              { caption: { $null: true } },
              { caption: '' },
            ],
          },
        });

        if (files.length === 0) {
          jobService.updateJob(jobId, {
            status: 'completed',
            completedAt: new Date(),
          });
          return;
        }

        const BATCH_SIZE = 20;
        let successCount = 0;
        let errorCount = 0;
        const allErrors: Array<{ fileId: number; error: string }> = [];

        // Process in batches
        for (let i = 0; i < files.length; i += BATCH_SIZE) {
          const batch = files.slice(i, i + BATCH_SIZE);

          try {
            // Process this batch
            const metadataResults = await this.processFiles(batch);
            const result = await this.updateFilesWithAIMetadata(batch, metadataResults, { user });

            successCount += result.processed;
            errorCount += result.errors.length;
            allErrors.push(...result.errors);
          } catch (batchError) {
            // If batch fails, count all files in batch as errors
            errorCount += batch.length;
            batch.forEach((file) => {
              allErrors.push({
                fileId: file.id,
                error: batchError instanceof Error ? batchError.message : 'Batch processing failed',
              });
            });
          }

          // Update progress after each batch
          jobService.updateJob(jobId, {
            processedFiles: Math.min(i + batch.length, files.length),
            successCount,
            errorCount,
            errors: allErrors,
          });
        }

        // Mark as completed
        jobService.updateJob(jobId, {
          status: 'completed',
          completedAt: new Date(),
        });
      } catch (error) {
        strapi.log.error('AI metadata job failed', {
          jobId,
          error: error instanceof Error ? error.message : String(error),
        });

        jobService.updateJob(jobId, {
          status: 'failed',
          completedAt: new Date(),
        });
      }
    },

    /**
     * Processes provided files for AI metadata generation
     */
    async processFiles(files: File[]): Promise<Array<{ altText: string; caption: string } | null>> {
      if (!(await this.isEnabled()) || !aiServerUrl) {
        throw new Error('AI Metadata service is not enabled');
      }

      // Filter for image files only and track their original positions
      // We need to maintain the original indices so we can map AI results back correctly
      const imageFiles = files
        .map((file, index) => ({ file, originalIndex: index }))
        .filter(({ file }) => file.mime?.startsWith('image/'));

      // Convert filtered image files to InputFile format (uses thumbnails when available)
      const imageInputFiles = imageFiles.map(({ file }) => {
        const thumbnail = (file.formats as any)?.thumbnail;
        return {
          filepath: thumbnail?.url || file.url || '',
          mimetype: file.mime,
          originalFilename: file.name,
          size: thumbnail?.size || file.size,
          provider: file.provider,
        } as InputFile;
      });

      // If no image files, return sparse array with all nulls to avoid calling the AI server
      // This maintains the same array length as input files for proper index alignment
      if (imageFiles.length === 0) {
        return new Array(files.length).fill(null);
      }

      const formData = new FormData();

      for (const file of imageInputFiles) {
        const fullUrl =
          file.provider === 'local'
            ? strapi.config.get('server.absoluteUrl') + file.filepath
            : file.filepath;

        const resp = await fetch(fullUrl);
        if (!resp.ok) {
          strapi.log.error('Failed to fetch image', {
            fullUrl,
            status: resp.status,
            statusText: resp.statusText,
          });
          throw new Error(`Failed to fetch image from URL: ${fullUrl} (${resp.status})`);
        }
        const ab = await resp.arrayBuffer();
        const blob: Blob = new Blob([ab], { type: file.mimetype || undefined });
        formData.append('files', blob);
      }

      let token: string;
      try {
        const tokenData = await strapi.get('ai').getAiToken();
        token = tokenData.token;
      } catch (error) {
        throw new Error('Failed to retrieve AI token', {
          cause: error instanceof Error ? error : undefined,
        });
      }

      strapi.log.http('Contacting AI Server for media metadata generation', {
        aiServerUrl,
        imageCount: imageFiles.length,
      });

      const res = await fetch(`${aiServerUrl}/media-library/generate-metadata`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw Error(`AI metadata generation failed`, { cause: errorText });
      }

      const responseSchema = z.object({
        results: z.array(
          z.object({
            altText: z.string(),
            caption: z.string(),
          })
        ),
      });

      const { results } = responseSchema.parse(await res.json());
      strapi.log.http(`AI generated metadata successfully for ${results.length} files`);

      // Create sparse array with results at original indices
      // Example: files=[img1, pdf, img2] -> imageFiles=[{img1, index:0}, {img2, index:2}]
      // AI results=[meta1, meta2] -> sparse=[meta1, null, meta2]
      // This ensures metadata[i] corresponds to files[i], with null for non-images
      return imageFiles.reduce((sparseResults, { originalIndex }, resultIndex) => {
        sparseResults[originalIndex] = results[resultIndex];
        return sparseResults;
      }, new Array(files.length).fill(null));
    },
  };
};

export { createAIMetadataService };
