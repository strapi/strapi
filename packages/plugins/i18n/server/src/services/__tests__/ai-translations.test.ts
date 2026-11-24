import { createAITranslationsService, type AiTranslationsProvider } from '../ai-translations';

const createMockStrapi = ({
  isAvailable = true,
  authorizeCustomProvider = true,
  isStrapiManagedAiEnabled = true,
} = {}) =>
  ({
    ai: {
      admin: {
        isAvailable: jest.fn(() => isAvailable),
        authorizeCustomProvider: jest.fn(() => authorizeCustomProvider),
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

  test('nothing is registered until a provider is', async () => {
    const service = createAITranslationsService({ strapi: createMockStrapi() });

    expect(service.hasProvider()).toBe(false);
    await expect(service.generateTranslations(PARAMS)).rejects.toThrow(
      'No AI translations provider is registered.'
    );
  });

  test('registerStrapiManagedProvider installs the Strapi-managed provider', async () => {
    const strapi = createMockStrapi();
    const service = createAITranslationsService({ strapi });
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ localizations: [] }),
    });
    (global as any).fetch = fetchMock;

    service.registerStrapiManagedProvider();

    expect(service.hasProvider()).toBe(true);

    await service.generateTranslations(PARAMS);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/i18n/generate-localizations'),
      expect.anything()
    );
  });

  test('the Strapi-managed provider wraps AI token retrieval failures', async () => {
    const strapi = createMockStrapi();
    strapi.ai.admin.getAiToken.mockRejectedValue(new Error('license expired'));
    const service = createAITranslationsService({ strapi });
    (global as any).fetch = jest.fn();

    service.registerStrapiManagedProvider();

    await expect(service.generateTranslations(PARAMS)).rejects.toThrow(
      'Failed to retrieve AI token'
    );
    expect((global as any).fetch).not.toHaveBeenCalled();
  });

  test('the Strapi-managed provider throws when the AI server responds with an error', async () => {
    const strapi = createMockStrapi();
    const service = createAITranslationsService({ strapi });
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    });

    service.registerStrapiManagedProvider();

    await expect(service.generateTranslations(PARAMS)).rejects.toThrow(
      'AI Localizations request failed: Service Unavailable'
    );
    expect(strapi.log.error).toHaveBeenCalledWith(
      'AI Localizations request failed: 503 Service Unavailable'
    );
  });

  test('registerProvider asks core to authorize a custom provider', () => {
    const strapi = createMockStrapi();
    const service = createAITranslationsService({ strapi });

    service.registerProvider({ provider: createProvider() });

    expect(strapi.ai.admin.authorizeCustomProvider).toHaveBeenCalledTimes(1);
    expect(service.hasProvider()).toBe(true);
  });

  test('a rejected provider is not registered', async () => {
    const strapi = createMockStrapi({ authorizeCustomProvider: false });
    const service = createAITranslationsService({ strapi });
    const provider = createProvider();

    service.registerProvider({ provider });

    expect(service.hasProvider()).toBe(false);
    await expect(service.generateTranslations(PARAMS)).rejects.toThrow(
      'No AI translations provider is registered.'
    );
    expect(provider.generateTranslations).not.toHaveBeenCalled();
    expect(strapi.log.warn).not.toHaveBeenCalled();
  });

  test('a registered provider follows the AI availability switch at runtime', async () => {
    const strapi = createMockStrapi();
    const service = createAITranslationsService({ strapi });

    service.registerProvider({ provider: createProvider() });

    expect(service.hasProvider()).toBe(true);

    strapi.ai.admin.isAvailable.mockReturnValue(false);

    expect(service.hasProvider()).toBe(false);
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

  test('throws when a custom provider is registered after the Strapi-managed one', () => {
    const strapi = createMockStrapi();
    const service = createAITranslationsService({ strapi });

    service.registerStrapiManagedProvider();

    expect(() => service.registerProvider({ provider: createProvider() })).toThrow(
      'The AI translations provider "strapi-managed" is already registered, "byok" cannot replace it.'
    );
  });

  test('registerStrapiManagedProvider throws when a custom provider is already registered', () => {
    const strapi = createMockStrapi();
    const service = createAITranslationsService({ strapi });

    service.registerProvider({ provider: createProvider() });

    expect(() => service.registerStrapiManagedProvider()).toThrow(
      'The AI translations provider "byok" is already registered, "strapi-managed" cannot replace it.'
    );
  });

  test('registerStrapiManagedProvider is ignored without the cms-ai feature', () => {
    const strapi = createMockStrapi({ isStrapiManagedAiEnabled: false });
    const service = createAITranslationsService({ strapi });

    service.registerStrapiManagedProvider();

    expect(service.hasProvider()).toBe(false);
    expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('cms-ai'));
  });
});
