import type { Core, Modules } from '@strapi/types';

import { createStrapiManagedAiTranslationsProvider } from './ai-translations-strapi-managed';

export type GenerateTranslationsParams = {
  sourceLocale: string;
  targetLocales: string[];
  content: Record<string, unknown>;
  contentTypeSchema: Record<string, Record<string, unknown>>;
};

export type GenerateTranslationsResult = {
  localizations: Array<{ content: Record<string, unknown>; locale: string }>;
};

export type AiTranslationsProvider = Modules.AI.AiProvider & {
  generateTranslations: (params: GenerateTranslationsParams) => Promise<GenerateTranslationsResult>;
};

export interface AiTranslationsService {
  isEnabled(): boolean;
  registerProvider(params: { provider: AiTranslationsProvider }): void;
  generateTranslations(params: GenerateTranslationsParams): Promise<GenerateTranslationsResult>;
  validateProvider(): Promise<void>;
}

const createAITranslationsService = ({
  strapi,
}: {
  strapi: Core.Strapi;
}): AiTranslationsService => {
  const strapiManagedProvider = createStrapiManagedAiTranslationsProvider({ strapi });

  let registeredProvider: AiTranslationsProvider | null = null;

  const resolveProvider = (): AiTranslationsProvider | null => {
    if (!strapi.ai.admin.isAvailable()) {
      return null;
    }

    const provider = registeredProvider ?? strapiManagedProvider;

    return provider.isAvailable?.() === false ? null : provider;
  };

  return {
    isEnabled(): boolean {
      return resolveProvider() !== null;
    },

    registerProvider({ provider }: { provider: AiTranslationsProvider }) {
      if (registeredProvider !== null) {
        throw new Error(
          `The AI translations provider "${registeredProvider.name}" is already registered, "${provider.name}" cannot replace it.`
        );
      }

      registeredProvider = provider;
    },

    async generateTranslations(
      params: GenerateTranslationsParams
    ): Promise<GenerateTranslationsResult> {
      const provider = resolveProvider();

      if (provider === null) {
        throw new Error('No AI translations provider is registered.');
      }

      return provider.generateTranslations(params);
    },

    async validateProvider() {
      const provider = resolveProvider();

      if (!provider?.validate) {
        return;
      }

      try {
        await provider.validate();
      } catch (error) {
        throw new Error(
          `The AI translations provider "${provider.name}" is not correctly configured: ${
            error instanceof Error ? error.message : String(error)
          }`,
          { cause: error instanceof Error ? error : undefined }
        );
      }
    },
  };
};

export { createAITranslationsService };
