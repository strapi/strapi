import type { Core } from '@strapi/types';

import type { AiTranslationsProvider } from './ai-translations';

const createStrapiManagedAiTranslationsProvider = ({
  strapi,
}: {
  strapi: Core.Strapi;
}): AiTranslationsProvider => {
  // TODO: add a helper function to get the AI server URL
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

    isAvailable: () => strapi.ai.admin.isStrapiManagedAiEnabled(),

    async generateTranslations({ sourceLocale, targetLocales, content, contentTypeSchema }) {
      const token = await getAiToken();

      strapi.log.http('Contacting AI Server for localizations generation');
      const response = await fetch(`${aiServerUrl}/i18n/generate-localizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          sourceLocale,
          targetLocales,
          contentTypeSchema,
        }),
      });

      if (!response.ok) {
        strapi.log.error(
          `AI Localizations request failed: ${response.status} ${response.statusText}`
        );

        throw new Error(`AI Localizations request failed: ${response.statusText}`);
      }

      return (await response.json()) as Awaited<
        ReturnType<AiTranslationsProvider['generateTranslations']>
      >;
    },
  };
};

export { createStrapiManagedAiTranslationsProvider };
