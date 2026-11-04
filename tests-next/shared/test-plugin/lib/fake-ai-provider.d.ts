export interface FakeAiCall {
  sourceLocale: string;
  targetLocales: string[];
  content: unknown;
}

export declare const createFakeAiTranslationsProvider: () => {
  calls: FakeAiCall[];
  provider: {
    name: string;
    generateTranslations(params: {
      sourceLocale: string;
      targetLocales: string[];
      content: Record<string, unknown>;
    }): Promise<{ localizations: Array<{ locale: string; content: Record<string, unknown> }> }>;
  };
};
