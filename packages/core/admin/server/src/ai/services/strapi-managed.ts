import type { Core, Modules } from '@strapi/types';

const createStrapiManagedAiProvider = ({
  strapi,
}: {
  strapi: Core.Strapi;
}): Modules.AI.AiService => {
  const aiServerUrl = process.env.STRAPI_AI_URL || 'https://strapi-ai.apps.strapi.io';

  const getAiToken = async () => {
    let token: string;
    try {
      const tokenData = await strapi.ai.admin.getAiToken();
      token = tokenData.token;
    } catch (error) {
      // TODO upsertJob => failed

      throw new Error('Failed to retrieve AI token', {
        cause: error instanceof Error ? error : undefined,
      });
    }

    return token;
  };
  return {
    async generateLocalizations({ sourceLocale, targetLocales, content, contentTypeSchema }) {
      const token = await getAiToken();

      strapi.log.http('Contacting AI Server for localizations generation');
      const response = await fetch(`${aiServerUrl}/i18n/generate-localizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: translateableContent,
          sourceLocale,
          targetLocales,
          contentTypeSchema: minimalContentTypeSchema,
        }),
      });

      if (!response.ok) {
        strapi.log.error(
          `AI Localizations request failed: ${response.status} ${response.statusText}`
        );

        throw new Error(`AI Localizations request failed: ${response.statusText}`);
      }

      const aiResult = (await response.json()) as {
        localizations: Array<{ content: Record<string, unknown>; locale: string }>;
      };

      return aiResult;
    },
  };
};

export { createStrapiManagedAiProvider };
