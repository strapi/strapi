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
      /** Top-level attribute types, as i18n sends them. */
      contentTypeSchema: Record<string, { type?: string }>;
    }): Promise<{ localizations: Array<{ locale: string; content: Record<string, unknown> }> }>;
  };
};
