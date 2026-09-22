import type { Core } from '@strapi/types';

import type { AiMetadataProvider } from './ai-metadata-provider';

const createStrapiManagedAiMetadataProvider = ({
  strapi,
}: {
  strapi: Core.Strapi;
}): AiMetadataProvider => {
  // TODO(ai): add a helper function to get the AI server URL
  const aiServerUrl = process.env.STRAPI_AI_URL || 'https://strapi-ai.apps.strapi.io';

  const getAiToken = async () => {
    try {
      const { token } = await strapi.ai.admin.getAiToken();
      return token;
    } catch (error) {
      throw new Error('Failed to retrieve AI token', {
        cause: error instanceof Error ? error : undefined,
      });
    }
  };

  return {
    name: 'strapi-managed',

    async generateMetadata({ images }) {
      const formData = new FormData();

      for (const image of images) {
        formData.append('files', image);
      }

      const token = await getAiToken();

      strapi.log.http('Contacting AI Server for media metadata generation', {
        aiServerUrl,
        imageCount: images.length,
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
        strapi.log.error(`AI metadata generation request failed: ${res.status} ${res.statusText}`);

        throw Error(`AI metadata generation failed`, { cause: errorText });
      }

      return (await res.json()) as Awaited<ReturnType<AiMetadataProvider['generateMetadata']>>;
    },
  };
};

export { createStrapiManagedAiMetadataProvider };
