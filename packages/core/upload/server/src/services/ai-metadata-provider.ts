import type { Core, Modules } from '@strapi/types';
import * as z from 'zod/v4';

import { createStrapiManagedAiMetadataProvider } from './ai-metadata-strapi-managed';

export type GenerateMetadataParams = { images: Blob[] };

export type GenerateMetadataResult = {
  results: Array<{ altText: string; caption: string }>;
};

export type AiMetadataProvider = Modules.AI.AiProvider & {
  generateMetadata: (params: GenerateMetadataParams) => Promise<GenerateMetadataResult>;
};

export interface AiMetadataProviderService {
  hasProvider(): boolean;
  registerProvider(params: { provider: AiMetadataProvider }): void;
  registerStrapiManagedProvider(): void;
  generateMetadata(params: GenerateMetadataParams): Promise<GenerateMetadataResult>;
}

const resultSchema = z.object({
  results: z.array(
    z.object({
      altText: z.string(),
      caption: z.string(),
    })
  ),
});

// This service mirrors i18n's ai-translations service on purpose. Keep the two in sync,
// and only extract the shared logic once a third feature needs it.
const createAIMetadataProviderService = ({
  strapi,
}: {
  strapi: Core.Strapi;
}): AiMetadataProviderService => {
  let registeredProvider: AiMetadataProvider | null = null;

  const resolveProvider = (): AiMetadataProvider | null => {
    if (!strapi.ai.admin.isAvailable()) {
      return null;
    }

    return registeredProvider;
  };

  return {
    hasProvider(): boolean {
      return resolveProvider() !== null;
    },

    registerProvider({ provider }: { provider: AiMetadataProvider }) {
      if (!strapi.ai.admin.authorizeCustomProvider()) {
        return;
      }

      if (registeredProvider !== null) {
        throw new Error(
          `The AI metadata provider "${registeredProvider.name}" is already registered, "${provider.name}" cannot replace it.`
        );
      }

      registeredProvider = provider;
    },

    registerStrapiManagedProvider() {
      if (!strapi.ai.admin.isStrapiManagedAiEnabled()) {
        strapi.log.warn(
          'The Strapi-managed AI metadata provider was ignored: the Strapi license does not include the "cms-ai" feature.'
        );
        return;
      }

      const provider = createStrapiManagedAiMetadataProvider({ strapi });

      if (registeredProvider !== null) {
        throw new Error(
          `The AI metadata provider "${registeredProvider.name}" is already registered, "${provider.name}" cannot replace it.`
        );
      }

      registeredProvider = provider;
    },

    async generateMetadata(params: GenerateMetadataParams): Promise<GenerateMetadataResult> {
      const provider = resolveProvider();

      if (provider === null) {
        throw new Error('No AI metadata provider is registered.');
      }

      const raw = await provider.generateMetadata(params);
      const result = resultSchema.parse(raw);

      const fileCount = result.results.length;

      strapi.log.http(
        `AI generated metadata successfully for ${fileCount} file${fileCount === 1 ? '' : 's'}`
      );

      return result;
    },
  };
};

export { createAIMetadataProviderService };
