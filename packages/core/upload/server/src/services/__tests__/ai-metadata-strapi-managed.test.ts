import { createStrapiManagedAiMetadataProvider } from '../ai-metadata-strapi-managed';

const createMockStrapi = () =>
  ({
    ai: {
      admin: {
        getAiToken: jest.fn().mockResolvedValue({ token: 'test-token' }),
      },
    },
    log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), http: jest.fn() },
  }) as any;

const images = [
  new Blob(['first'], { type: 'image/png' }),
  new Blob(['second'], { type: 'image/jpeg' }),
];

describe('Strapi-managed AI metadata provider', () => {
  beforeEach(() => {
    process.env.STRAPI_AI_URL = 'https://ai.strapi.test';
  });

  afterEach(() => {
    delete process.env.STRAPI_AI_URL;
    delete (global as any).fetch;
  });

  test('posts every image to the AI server with the AI token', async () => {
    const strapi = createMockStrapi();
    const results = [
      { altText: 'First alt', caption: 'First caption' },
      { altText: 'Second alt', caption: 'Second caption' },
    ];
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ results }) });
    (global as any).fetch = fetchMock;

    const provider = createStrapiManagedAiMetadataProvider({ strapi });

    await expect(provider.generateMetadata({ images })).resolves.toEqual({ results });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://ai.strapi.test/media-library/generate-metadata',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer test-token' },
      })
    );

    // `FormData` wraps each Blob in a File, so compare what it carries.
    const { body } = fetchMock.mock.calls[0][1];
    expect(body).toBeInstanceOf(FormData);

    const sent = body.getAll('files') as Blob[];
    expect(sent).toHaveLength(2);
    expect(sent.map((image) => image.type)).toEqual(['image/png', 'image/jpeg']);
    await expect(Promise.all(sent.map((image) => image.text()))).resolves.toEqual([
      'first',
      'second',
    ]);
  });

  test('wraps AI token retrieval failures', async () => {
    const strapi = createMockStrapi();
    strapi.ai.admin.getAiToken.mockRejectedValue(new Error('license expired'));
    (global as any).fetch = jest.fn();

    const provider = createStrapiManagedAiMetadataProvider({ strapi });

    await expect(provider.generateMetadata({ images })).rejects.toThrow(
      'Failed to retrieve AI token'
    );
    expect((global as any).fetch).not.toHaveBeenCalled();
  });

  test('throws with the response body as cause when the AI server fails', async () => {
    const strapi = createMockStrapi();
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    const provider = createStrapiManagedAiMetadataProvider({ strapi });

    await expect(provider.generateMetadata({ images })).rejects.toThrow(
      'AI metadata generation failed'
    );
    await expect(provider.generateMetadata({ images })).rejects.toMatchObject({
      cause: 'Internal Server Error',
    });
  });
});
