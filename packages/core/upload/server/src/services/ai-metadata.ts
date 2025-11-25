import type { Core } from '@strapi/types';
import { z } from 'zod';
import { InputFile } from '../types';
import { Settings } from '../controllers/validation/admin/settings';

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

    async processFiles(
      files: InputFile[]
    ): Promise<Array<{ altText: string; caption: string } | null>> {
      if (!(await this.isEnabled()) || !aiServerUrl) {
        throw new Error('AI Metadata service is not enabled');
      }

      // Filter for image files only and track their original positions
      // We need to maintain the original indices so we can map AI results back correctly
      const imageFiles = files
        .map((file, index) => ({ file, originalIndex: index }))
        .filter(({ file }) => file.mimetype?.startsWith('image/'));

      // If no image files, return sparse array with all nulls to avoid calling the AI server
      // This maintains the same array length as input files for proper index alignment
      if (imageFiles.length === 0) {
        return new Array(files.length).fill(null);
      }

      const formData = new FormData();

      for (const { file } of imageFiles) {
        const fullUrl =
          file.provider === 'local'
            ? strapi.config.get('server.absoluteUrl') + file.filepath
            : file.filepath;

        const resp = await fetch(fullUrl);
        if (!resp.ok) {
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

      strapi.log.http('Contacting AI Server for media metadata generation');
      const res = await fetch(`${aiServerUrl}/media-library/generate-metadata`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw Error(`AI metadata generation failed`, { cause: await res.text() });
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
      strapi.log.http(`Media metadata generated successfully for ${results.length} files`);

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
