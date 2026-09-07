import { createAITranslationsService, type AiTranslationsProvider } from '../ai-translations';

const createMockStrapi = ({ isAvailable = true, isStrapiManagedAiEnabled = true } = {}) =>
  ({
    ai: {
      admin: {
        isAvailable: jest.fn(() => isAvailable),
        isStrapiManagedAiEnabled: jest.fn(() => isStrapiManagedAiEnabled),
        getAiToken: jest.fn().mockResolvedValue({ token: 'test-token' }),
      },
    },
    log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), http: jest.fn() },
  }) as any;

const PARAMS = {
  sourceLocale: 'en',
  targetLocales: ['fr'],
  content: { title: 'Some title' },
  contentTypeSchema: { title: { type: 'string' } },
};

const createProvider = (
  overrides: Partial<AiTranslationsProvider> = {}
): AiTranslationsProvider => ({
  name: 'byok',
  generateTranslations: jest.fn().mockResolvedValue({ localizations: [] }),
  ...overrides,
});

describe('ai-translations service', () => {
  afterEach(() => {
    delete (global as any).fetch;
  });

  test('falls back to the Strapi-managed provider', async () => {
    const service = createAITranslationsService({ strapi: createMockStrapi() });
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ localizations: [] }),
    });
    (global as any).fetch = fetchMock;

    expect(service.isEnabled()).toBe(true);

    await service.generateTranslations(PARAMS);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/i18n/generate-localizations'),
      expect.anything()
    );
  });

  test('does not expose the Strapi-managed provider without the cms-ai license feature', async () => {
    const service = createAITranslationsService({
      strapi: createMockStrapi({ isStrapiManagedAiEnabled: false }),
    });

    expect(service.isEnabled()).toBe(false);
    await expect(service.generateTranslations(PARAMS)).rejects.toThrow(
      'No AI translations provider is registered.'
    );
  });

  test('follows the license when the entitlement is revoked at runtime', () => {
    const strapi = createMockStrapi();
    const service = createAITranslationsService({ strapi });

    expect(service.isEnabled()).toBe(true);

    strapi.ai.admin.isStrapiManagedAiEnabled.mockReturnValue(false);

    expect(service.isEnabled()).toBe(false);
  });

  test('a registered provider replaces the Strapi-managed one', async () => {
    const service = createAITranslationsService({ strapi: createMockStrapi() });
    const provider = createProvider();

    service.registerProvider({ provider });

    expect(service.isEnabled()).toBe(true);
    await expect(service.generateTranslations(PARAMS)).resolves.toEqual({ localizations: [] });
    expect(provider.generateTranslations).toHaveBeenCalledWith(PARAMS);
  });

  test('a registered provider does not need the cms-ai license feature', async () => {
    const service = createAITranslationsService({
      strapi: createMockStrapi({ isStrapiManagedAiEnabled: false }),
    });
    const provider = createProvider();

    service.registerProvider({ provider });

    expect(service.isEnabled()).toBe(true);

    await service.generateTranslations(PARAMS);

    expect(provider.generateTranslations).toHaveBeenCalledWith(PARAMS);
  });

  test('a registered provider that reports itself unavailable disables the feature', async () => {
    const service = createAITranslationsService({ strapi: createMockStrapi() });
    const provider = createProvider({ isAvailable: () => false });

    service.registerProvider({ provider });

    expect(service.isEnabled()).toBe(false);
    await expect(service.generateTranslations(PARAMS)).rejects.toThrow(
      'No AI translations provider is registered.'
    );
    expect(provider.generateTranslations).not.toHaveBeenCalled();
  });

  test('does not fall back to the Strapi-managed provider when the registered one is unavailable', () => {
    const service = createAITranslationsService({ strapi: createMockStrapi() });

    service.registerProvider({ provider: createProvider({ isAvailable: () => false }) });

    expect(service.isEnabled()).toBe(false);
  });

  test('follows a registered provider that becomes available at runtime', () => {
    const service = createAITranslationsService({ strapi: createMockStrapi() });
    let available = false;

    service.registerProvider({ provider: createProvider({ isAvailable: () => available }) });

    expect(service.isEnabled()).toBe(false);

    available = true;

    expect(service.isEnabled()).toBe(true);
  });

  test('a registered provider follows the AI availability switch', async () => {
    const service = createAITranslationsService({
      strapi: createMockStrapi({ isAvailable: false, isStrapiManagedAiEnabled: false }),
    });

    service.registerProvider({ provider: createProvider() });

    expect(service.isEnabled()).toBe(false);
    await expect(service.generateTranslations(PARAMS)).rejects.toThrow(
      'No AI translations provider is registered.'
    );
  });

  test('throws when a second provider is registered', () => {
    const service = createAITranslationsService({ strapi: createMockStrapi() });

    service.registerProvider({ provider: createProvider() });

    expect(() =>
      service.registerProvider({ provider: createProvider({ name: 'other-byok' }) })
    ).toThrow(
      'The AI translations provider "byok" is already registered, "other-byok" cannot replace it.'
    );
  });

  describe('validateProvider', () => {
    test('wraps a provider configuration error', async () => {
      const service = createAITranslationsService({ strapi: createMockStrapi() });

      service.registerProvider({
        provider: createProvider({
          validate() {
            throw new Error('missing API key');
          },
        }),
      });

      await expect(service.validateProvider()).rejects.toThrow(
        'The AI translations provider "byok" is not correctly configured: missing API key'
      );
    });

    test('resolves when the provider does not need validation', async () => {
      const service = createAITranslationsService({ strapi: createMockStrapi() });

      service.registerProvider({ provider: createProvider() });

      await expect(service.validateProvider()).resolves.toBeUndefined();
    });

    test('resolves when no provider is registered', async () => {
      const service = createAITranslationsService({
        strapi: createMockStrapi({ isStrapiManagedAiEnabled: false }),
      });

      await expect(service.validateProvider()).resolves.toBeUndefined();
    });

    test('skips a registered provider that reports itself unavailable', async () => {
      const service = createAITranslationsService({ strapi: createMockStrapi() });
      const validate = jest.fn();

      service.registerProvider({
        provider: createProvider({ isAvailable: () => false, validate }),
      });

      await expect(service.validateProvider()).resolves.toBeUndefined();
      expect(validate).not.toHaveBeenCalled();
    });
  });
});
