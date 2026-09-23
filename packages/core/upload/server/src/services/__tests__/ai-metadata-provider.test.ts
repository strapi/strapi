import { createAIMetadataProviderService, type AiMetadataProvider } from '../ai-metadata-provider';

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

const PARAMS = { images: [new Blob(['image'], { type: 'image/png' })] };

const createProvider = (overrides: Partial<AiMetadataProvider> = {}): AiMetadataProvider => ({
  name: 'byok',
  generateMetadata: jest.fn().mockResolvedValue({ results: [] }),
  ...overrides,
});

describe('ai-metadata-provider service', () => {
  test('nothing is registered until a provider is', async () => {
    const service = createAIMetadataProviderService({ strapi: createMockStrapi() });

    expect(service.hasProvider()).toBe(false);
    await expect(service.generateMetadata(PARAMS)).rejects.toThrow(
      'No AI metadata provider is registered.'
    );
  });

  test('registerProvider asks core to authorize a custom provider', () => {
    const strapi = createMockStrapi();
    const service = createAIMetadataProviderService({ strapi });

    service.registerProvider({ provider: createProvider() });

    expect(strapi.ai.admin.authorizeCustomProvider).toHaveBeenCalledTimes(1);
    expect(service.hasProvider()).toBe(true);
  });

  test('a rejected provider is not registered', async () => {
    const strapi = createMockStrapi({ authorizeCustomProvider: false });
    const service = createAIMetadataProviderService({ strapi });
    const provider = createProvider();

    service.registerProvider({ provider });

    expect(service.hasProvider()).toBe(false);
    await expect(service.generateMetadata(PARAMS)).rejects.toThrow(
      'No AI metadata provider is registered.'
    );
    expect(provider.generateMetadata).not.toHaveBeenCalled();
    expect(strapi.log.warn).not.toHaveBeenCalled();
  });

  test('a registered provider follows the AI availability switch at runtime', async () => {
    const strapi = createMockStrapi();
    const service = createAIMetadataProviderService({ strapi });

    service.registerProvider({ provider: createProvider() });

    expect(service.hasProvider()).toBe(true);

    strapi.ai.admin.isAvailable.mockReturnValue(false);

    expect(service.hasProvider()).toBe(false);
    await expect(service.generateMetadata(PARAMS)).rejects.toThrow(
      'No AI metadata provider is registered.'
    );
  });

  test('throws when a second custom provider is registered', () => {
    const service = createAIMetadataProviderService({ strapi: createMockStrapi() });

    service.registerProvider({ provider: createProvider() });

    expect(() =>
      service.registerProvider({ provider: createProvider({ name: 'other-byok' }) })
    ).toThrow(
      'The AI metadata provider "byok" is already registered, "other-byok" cannot replace it.'
    );
  });

  test('throws when a custom provider is registered after the Strapi-managed one', () => {
    const service = createAIMetadataProviderService({ strapi: createMockStrapi() });

    service.registerStrapiManagedProvider();

    expect(() => service.registerProvider({ provider: createProvider() })).toThrow(
      'The AI metadata provider "strapi-managed" is already registered, "byok" cannot replace it.'
    );
  });

  test('registerStrapiManagedProvider throws when a custom provider is already registered', () => {
    const service = createAIMetadataProviderService({ strapi: createMockStrapi() });

    service.registerProvider({ provider: createProvider() });

    expect(() => service.registerStrapiManagedProvider()).toThrow(
      'The AI metadata provider "byok" is already registered, "strapi-managed" cannot replace it.'
    );
  });

  test('registerStrapiManagedProvider is ignored without the cms-ai feature', () => {
    const strapi = createMockStrapi({ isStrapiManagedAiEnabled: false });
    const service = createAIMetadataProviderService({ strapi });

    service.registerStrapiManagedProvider();

    expect(service.hasProvider()).toBe(false);
    expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('cms-ai'));
  });

  test('returns the provider result and logs how many files it covers', async () => {
    const strapi = createMockStrapi();
    const service = createAIMetadataProviderService({ strapi });
    const results = [{ altText: 'An alt text', caption: 'A caption' }];

    service.registerProvider({
      provider: createProvider({
        generateMetadata: jest.fn().mockResolvedValue({ results }),
      }),
    });

    await expect(service.generateMetadata(PARAMS)).resolves.toEqual({ results });
    expect(strapi.log.http).toHaveBeenCalledWith('AI generated metadata successfully for 1 file');
  });

  test('logs the file count in the plural', async () => {
    const strapi = createMockStrapi();
    const service = createAIMetadataProviderService({ strapi });
    const results = [
      { altText: 'An alt text', caption: 'A caption' },
      { altText: 'Another alt text', caption: 'Another caption' },
    ];

    service.registerProvider({
      provider: createProvider({
        generateMetadata: jest.fn().mockResolvedValue({ results }),
      }),
    });

    await service.generateMetadata(PARAMS);

    expect(strapi.log.http).toHaveBeenCalledWith('AI generated metadata successfully for 2 files');
  });

  test('rejects a result entry that is null', async () => {
    const service = createAIMetadataProviderService({ strapi: createMockStrapi() });

    service.registerProvider({
      provider: createProvider({
        generateMetadata: jest.fn().mockResolvedValue({ results: [null] }),
      }),
    });

    await expect(service.generateMetadata(PARAMS)).rejects.toThrow();
  });

  test('rejects a result entry that misses a field', async () => {
    const service = createAIMetadataProviderService({ strapi: createMockStrapi() });

    service.registerProvider({
      provider: createProvider({
        generateMetadata: jest.fn().mockResolvedValue({ results: [{ altText: 'An alt text' }] }),
      }),
    });

    await expect(service.generateMetadata(PARAMS)).rejects.toThrow();
  });
});
