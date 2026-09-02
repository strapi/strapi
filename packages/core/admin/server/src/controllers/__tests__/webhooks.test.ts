import { webhookValidator } from '../webhooks';

// Repro + fix coverage for https://github.com/strapi/strapi/issues/26876
// In production the webhook URL validator rejects non-public (internal/cluster)
// URLs as an SSRF guard. That must stay the secure default, but users running
// behind private networks (e.g. Kubernetes) need an opt-in to allow them.

const INTERNAL_URL = 'http://10.0.0.5/strapi/cache/invalidate';
const PUBLIC_URL = 'https://example.com/hook';

const baseWebhook = {
  name: 'test',
  headers: {},
  events: ['entry.create'],
};

const setConfig = (webhooks: Record<string, unknown>) => {
  (global as any).strapi = {
    config: {
      get(key: string, defaultValue?: unknown) {
        if (key === 'server.webhooks.allowNonPublicUrls') {
          return webhooks.allowNonPublicUrls ?? defaultValue;
        }
        return defaultValue;
      },
    },
  };
};

describe('webhookValidator - non-public URL handling (#26876)', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    delete (global as any).strapi;
  });

  it('rejects internal URLs in production by default (SSRF guard stays on)', async () => {
    process.env.NODE_ENV = 'production';
    setConfig({});

    await expect(webhookValidator.validate({ ...baseWebhook, url: INTERNAL_URL })).rejects.toThrow(
      /public internet/
    );
  });

  it('allows internal URLs in production when server.webhooks.allowNonPublicUrls is true', async () => {
    process.env.NODE_ENV = 'production';
    setConfig({ allowNonPublicUrls: true });

    await expect(
      webhookValidator.validate({ ...baseWebhook, url: INTERNAL_URL })
    ).resolves.toMatchObject({ url: INTERNAL_URL });
  });

  it('always allows public URLs in production', async () => {
    process.env.NODE_ENV = 'production';
    setConfig({});

    await expect(
      webhookValidator.validate({ ...baseWebhook, url: PUBLIC_URL })
    ).resolves.toMatchObject({ url: PUBLIC_URL });
  });

  it('does not enforce the guard outside production', async () => {
    process.env.NODE_ENV = 'development';
    setConfig({});

    await expect(
      webhookValidator.validate({ ...baseWebhook, url: INTERNAL_URL })
    ).resolves.toMatchObject({ url: INTERNAL_URL });
  });
});
