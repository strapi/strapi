import type { Core } from '@strapi/types';
import { z } from 'zod';
import { InputFile, File } from '../types';
import { Settings } from '../controllers/validation/admin/settings';
import { getService } from '../utils';
import { buildFormDataFromFiles } from '../utils/images';
import { AI_METADATA_CHUNK_SIZE, AI_METADATA_SUPPORTED_IMAGE_TYPES } from '../constants';

import { isAIMetadataSupportedMime } from '../../../shared/constants';

import type { UnstableGenerateAIMetadata } from '../../../shared/contracts/files';

export type AIMetadataFileResult = UnstableGenerateAIMetadata.FileResult;

/**
 * Supported image types for AI metadata generation. Lives in `shared/` so the
 * admin panel gates the bulk action on exactly what the provider accepts.
 */
const SUPPORTED_IMAGE_TYPES = AI_METADATA_SUPPORTED_IMAGE_TYPES;

const isSupportedImage = (file: File): boolean => isAIMetadataSupportedMime(file.mime);

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
};

const createAIMetadataService = ({ strapi }: { strapi: Core.Strapi }) => {
  const aiServerUrl = process.env.STRAPI_AI_URL || 'https://strapi-ai.apps.strapi.io';

  return {
    async isEnabled() {
      if (strapi.ai.admin.isEnabled() === false) {
        return false;
      }
      const settings: Settings = await strapi.plugin('upload').service('upload').getSettings();
      return settings.aiMetadata ?? true;
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
     * Generate AI metadata for an explicit selection of files, synchronously.
     *
     * Unlike `processExistingFiles`, this does not create a job and does not
     * filter on missing metadata — the selection is what the user asked for.
     * Existing alt text / captions are still preserved by
     * `updateFilesWithAIMetadata`, so a file that already has both is reported
     * as `success` without being modified.
     *
     * Images are processed in sequential chunks so one failing chunk only
     * affects its own files; every other chunk still runs.
     *
     * @experimental
     */
    async generateForFiles(
      fileIds: Array<number | string>,
      user: { id: string | number }
    ): Promise<AIMetadataFileResult[]> {
      // `yup.strapiID()` accepts both numbers and numeric strings without
      // coercing, so normalise here — otherwise a request sending `["1"]`
      // would never match the numeric ids coming back from the database.
      const normalisedIds = fileIds.map(Number);
      const uniqueIds = [...new Set(normalisedIds)];

      const files: File[] = await strapi.db.query('plugin::upload.file').findMany({
        where: { id: { $in: uniqueIds } },
      });

      const filesById = new Map(files.map((file) => [file.id, file]));

      // Keyed by input id so the response order matches the request order.
      const resultsById = new Map<number, AIMetadataFileResult>();
      const images: File[] = [];

      uniqueIds.forEach((id) => {
        const file = filesById.get(id);

        if (!file) {
          resultsById.set(id, { id, status: 'error', error: 'File not found' });
          return;
        }

        // Only the formats the AI provider understands are sent; anything else
        // (non-images, but also exotic image formats like SVG or TIFF) is
        // reported as skipped rather than failed.
        if (!isSupportedImage(file)) {
          resultsById.set(id, { id, status: 'skipped' });
          return;
        }

        images.push(file);
      });

      for (const imageChunk of chunk(images, AI_METADATA_CHUNK_SIZE)) {
        try {
          const metadataResults = await this.processFiles(imageChunk);
          await this.updateFilesWithAIMetadata(imageChunk, metadataResults, user);

          imageChunk.forEach((file, index) => {
            resultsById.set(file.id, {
              id: file.id,
              status: metadataResults[index] ? 'success' : 'error',
              ...(metadataResults[index]
                ? {}
                : { error: 'AI metadata generation returned no result' }),
            });
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'AI metadata generation failed';

          strapi.log.error('AI metadata generation failed for a chunk of files', {
            fileIds: imageChunk.map((file) => file.id),
            message,
          });

          imageChunk.forEach((file) => {
            resultsById.set(file.id, { id: file.id, status: 'error', error: message });
          });
        }
      }

      return normalisedIds.map(
        (id) => resultsById.get(id) ?? { id, status: 'error', error: 'File not processed' }
      );
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
      const createEmptyMetadataResults = (): Array<{ altText: string; caption: string } | null> =>
        Array.from({ length: files.length }, () => null);

      // If no image files, return sparse array with all nulls to avoid calling the AI server
      // This maintains the same array length as input files for proper index alignment
      if (imageFiles.length === 0) {
        return createEmptyMetadataResults();
      }

      const formData = await buildFormDataFromFiles(
        imageInputFiles,
        strapi.config.get('server.absoluteUrl'),
        strapi.log
      );

      let token: string;
      try {
        const tokenData = await strapi.ai.admin.getAiToken();
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
      }, createEmptyMetadataResults());
    },
  };
};

export { createAIMetadataService };
