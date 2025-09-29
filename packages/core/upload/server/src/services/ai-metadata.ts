import type { Core } from '@strapi/types';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { InputFile } from '../types';

const createAIMetadataService = ({ strapi }: { strapi: Core.Strapi }) => {
  const aiServerUrl = process.env.STRAPI_ADMIN_AI_URL || process.env.STRAPI_AI_URL;

  return {
    isEnabled() {
      const isAIEnabled = strapi.config.get('admin.ai.enabled', false);

      // TODO replace by a specific feature check once it's set up in the license registry
      const { isEE } = strapi.ee;

      return isAIEnabled && isEE;
    },

    async processFiles(
      files: InputFile[]
    ): Promise<Array<{ altText: string; caption: string } | null>> {
      if (!this.isEnabled() || !aiServerUrl) {
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
        const fileBuffer = await readFile(file.filepath);
        const blob = new Blob([fileBuffer.buffer as ArrayBuffer], {
          type: file.mimetype || undefined,
        });
        formData.append('files', blob);
      }

      const { token } = await strapi.service('admin::user').getAiToken();

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
