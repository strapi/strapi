import type { Core, Modules } from '@strapi/types';

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
  hasProvider(): boolean;
  registerProvider(params: { provider: AiTranslationsProvider }): void;
  generateTranslations(params: GenerateTranslationsParams): Promise<GenerateTranslationsResult>;
}

const createAITranslationsService = ({
  strapi,
}: {
  strapi: Core.Strapi;
}): AiTranslationsService => {
  let registeredProvider: AiTranslationsProvider | null = null;

  const resolveProvider = (): AiTranslationsProvider | null => {
    if (!strapi.ai.admin.isAvailable()) {
      return null;
    }

    return registeredProvider;
  };

  return {
    hasProvider(): boolean {
      return resolveProvider() !== null;
    },

    registerProvider({ provider }: { provider: AiTranslationsProvider }) {
      if (!strapi.ai.admin.isAvailable()) {
        strapi.log.warn(
          `The AI translations provider "${provider.name}" was ignored: AI features require an Enterprise license and "admin.ai.enabled" to be true.`
        );
        return;
      }

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
  };
};

export { createAITranslationsService };
