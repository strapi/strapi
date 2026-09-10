import { patchPreviewForSpaces } from '../preview-integration';

describe('preview integration', () => {
  const install = (space?: { id: number; slug: string }) => {
    let provider: (() => Promise<unknown>) | undefined;
    // The jest setup rebuilds `strapi.plugin()` from this `plugins` map.
    const strapi = {
      requestContext: {
        get: () => (space ? { state: { spaceId: space.id, spaceSlug: space.slug } } : undefined),
      },
      plugins: {
        'content-manager': {
          services: {
            'preview-config': {
              registerParamsProvider: (_name: string, next: () => Promise<unknown>) => {
                provider = next;
              },
            },
          },
        },
        spaces: {
          services: {
            spaces: {
              getById: async (id: number) =>
                id === 2
                  ? {
                      id: 2,
                      slug: 'acme',
                      name: 'Acme',
                      previewBaseUrl: 'https://acme.example.com',
                    }
                  : null,
            },
          },
        },
      },
    } as any;
    (global as any).strapi = strapi;
    patchPreviewForSpaces(strapi);
    return { provider };
  };

  it('hands the active workspace and its preview origin to the handler', async () => {
    const { provider } = install({ id: 2, slug: 'acme' });

    await expect(provider!()).resolves.toEqual({
      id: 2,
      slug: 'acme',
      name: 'Acme',
      previewBaseUrl: 'https://acme.example.com',
    });
  });

  it('contributes nothing without a request workspace', async () => {
    const { provider } = install();

    await expect(provider!()).resolves.toBeUndefined();
  });

  it('is a no-op without the seam', () => {
    const strapi = {
      plugins: { 'content-manager': { services: { 'preview-config': {} } } },
    } as any;
    (global as any).strapi = strapi;
    expect(() => patchPreviewForSpaces(strapi)).not.toThrow();
  });
});
