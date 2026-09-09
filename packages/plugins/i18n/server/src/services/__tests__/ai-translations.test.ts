import { createAITranslationsService, type AiTranslationsProvider } from '../ai-translations';
import { createStrapiManagedAiTranslationsProvider } from '../ai-translations-strapi-managed';

const createMockStrapi = ({ isAvailable = true } = {}) =>
  ({
    ai: {
      admin: {
        isAvailable: jest.fn(() => isAvailable),
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

  test('the Strapi-managed provider registers like any other provider', async () => {
    const strapi = createMockStrapi();
    const service = createAITranslationsService({ strapi });
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ localizations: [] }),
    });
    (global as any).fetch = fetchMock;

    service.registerProvider({ provider: createStrapiManagedAiTranslationsProvider({ strapi }) });

    expect(service.hasProvider()).toBe(true);

    await service.generateTranslations(PARAMS);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/i18n/generate-localizations'),
      expect.anything()
    );
  });

  test('ignores a provider registered while AI is unavailable', async () => {
    const strapi = createMockStrapi({ isAvailable: false });
    const service = createAITranslationsService({ strapi });
    const provider = createProvider();

    service.registerProvider({ provider });

    expect(strapi.log.warn).toHaveBeenCalledWith(
      'The AI translations provider "byok" was ignored: AI features require an Enterprise license and "admin.ai.enabled" to be true.'
    );
    expect(service.hasProvider()).toBe(false);
    await expect(service.generateTranslations(PARAMS)).rejects.toThrow(
      'No AI translations provider is registered.'
    );
    expect(provider.generateTranslations).not.toHaveBeenCalled();
  });

  test('an ignored provider does not block a later registration', () => {
    const strapi = createMockStrapi({ isAvailable: false });
    const service = createAITranslationsService({ strapi });

    service.registerProvider({ provider: createProvider() });

    strapi.ai.admin.isAvailable.mockReturnValue(true);

    expect(() =>
      service.registerProvider({ provider: createProvider({ name: 'other-byok' }) })
    ).not.toThrow();
    expect(service.hasProvider()).toBe(true);
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
});
