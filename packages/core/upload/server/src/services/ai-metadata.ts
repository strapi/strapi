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

    async processFiles(files: InputFile[]) {
      const userService = strapi.service('admin::user');
      const formData = new FormData();

      for (const file of files) {
        const fileBuffer = await readFile(file.filepath);
        const blob = new Blob([fileBuffer.buffer as ArrayBuffer], {
          type: file.mimetype || undefined,
        });
        formData.append('files', blob);
      }

      // TODO: move user retrieval within getAiToken
      const { token } = await userService.getAiToken();

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
      strapi.log.http('Media metadata generated successfully');
      return results;
    },
  };
};

export { createAIMetadataService };
