import type { Core } from '@strapi/types';
import { z } from 'zod';
import { InputFile, File } from '../types';
import { Settings } from '../controllers/validation/admin/settings';
import { getService } from '../utils';
import { buildFormDataFromFiles } from '../utils/images';

/**
 * Supported image types for AI metadata generation
 * @see https://ai.google.dev/gemini-api/docs/image-understanding
 */
const SUPPORTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

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
      const imagesWithoutMetadataCountPromise = strapi.db.query('plugin::upload.file').count({
        where: {
          mime: {
            $in: SUPPORTED_IMAGE_TYPES,
          },
          $or: [
            { alternativeText: { $null: true } },
            { alternativeText: '' },
            { caption: { $null: true } },
            { caption: '' },
          ],
        },
      });

      const totalImagesPromise = strapi.db.query('plugin::upload.file').count({
        where: {
          mime: {
            $in: SUPPORTED_IMAGE_TYPES,
          },
        },
      });

      const [imagesWithoutMetadataCount, totalImages] = await Promise.all([
        imagesWithoutMetadataCountPromise,
        totalImagesPromise,
      ]);

      return { imagesWithoutMetadataCount, totalImages };
    },

    /**
     * Update files with AI-generated metadata
     * Shared logic used by both upload flow and retroactive processing
     */
    async updateFilesWithAIMetadata(
      files: File[],
      metadataResults: Array<{ altText: string; caption: string } | null>,
      user: { id: string | number }
    ) {
      const uploadService = strapi.plugin('upload').service('upload');

      await Promise.all(
        files.map(async (file, index) => {
          const aiMetadata = metadataResults[index];
          if (aiMetadata) {
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
              await uploadService.updateFileInfo(file.id, updateData, { user });

              // Update in-memory file object (needed for upload flow response)
              if (updateData.alternativeText !== undefined) {
                file.alternativeText = updateData.alternativeText;
              }
              if (updateData.caption !== undefined) {
                file.caption = updateData.caption;
              }
            }
          }
        })
      );
    },

    /**
     * Process existing files with job tracking for progress updates
     */
    async processExistingFiles(jobId: number, user: { id: string | number }): Promise<void> {
      const jobService = getService('aiMetadataJobs');

      try {
        // Mark as processing
        await jobService.updateJob(jobId, { status: 'processing' });

        // Query all images without metadata
        const files: File[] = await strapi.db.query('plugin::upload.file').findMany({
          where: {
            mime: {
              $in: SUPPORTED_IMAGE_TYPES,
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
          await jobService.updateJob(jobId, {
            status: 'completed',
            completedAt: new Date(),
          });
          return;
        }

        // Process all files at once
        const metadataResults = await this.processFiles(files);
        await this.updateFilesWithAIMetadata(files, metadataResults, user);

        // Mark as completed
        await jobService.updateJob(jobId, {
          status: 'completed',
          completedAt: new Date(),
        });
      } catch (error) {
        strapi.log.error('AI metadata job failed', {
          jobId,
          error: error instanceof Error ? error.message : String(error),
        });

        await jobService.updateJob(jobId, {
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

      const formData = await buildFormDataFromFiles(
        imageInputFiles,
        strapi.config.get('server.absoluteUrl'),
        strapi.log
      );

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
