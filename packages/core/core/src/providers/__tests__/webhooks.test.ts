import webhooksProvider, { DEFAULT_WEBHOOK_RELOAD_INTERVAL_MS } from '../webhooks';

type MockConfig = Record<string, unknown>;

const createMockStrapi = (config: MockConfig = {}, webhooks: unknown[] = []) => {
  const webhookStore = {
    findWebhooks: jest.fn().mockResolvedValue(webhooks),
  };
  const webhookRunner = {
    add: jest.fn(),
    startReloadPolling: jest.fn(),
    destroy: jest.fn(),
  };

  const strapi = {
    get: jest.fn((name: string) => {
      if (name === 'webhookStore') return webhookStore;
      if (name === 'webhookRunner') return webhookRunner;
      return undefined;
    }),
    config: {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const parts = key.split('.');
        let current: unknown = config;
        for (const part of parts) {
          if (current && typeof current === 'object' && part in (current as object)) {
            current = (current as Record<string, unknown>)[part];
          } else {
            return defaultValue;
          }
        }
        return current;
      }),
    },
  } as any;

  return { strapi, webhookStore, webhookRunner };
};

describe('webhooks provider - reload polling wiring', () => {
  test('polls with the default interval when reloadInterval is not configured', async () => {
    const { strapi, webhookRunner } = createMockStrapi();

    await webhooksProvider.bootstrap!(strapi);

    expect(webhookRunner.startReloadPolling).toHaveBeenCalledTimes(1);
    expect(webhookRunner.startReloadPolling).toHaveBeenCalledWith(
      DEFAULT_WEBHOOK_RELOAD_INTERVAL_MS,
      expect.any(Function)
    );
  });

  test('does not poll when reloadInterval is set to 0 (opt out)', async () => {
    const { strapi, webhookRunner } = createMockStrapi({
      server: { webhooks: { reloadInterval: 0 } },
    });

    await webhooksProvider.bootstrap!(strapi);

    expect(webhookRunner.startReloadPolling).not.toHaveBeenCalled();
  });

  test('honours a custom reloadInterval', async () => {
    const { strapi, webhookRunner } = createMockStrapi({
      server: { webhooks: { reloadInterval: 5000 } },
    });

    await webhooksProvider.bootstrap!(strapi);

    expect(webhookRunner.startReloadPolling).toHaveBeenCalledWith(5000, expect.any(Function));
  });

  test('the loader passed to startReloadPolling reads from the webhook store', async () => {
    const { strapi, webhookStore, webhookRunner } = createMockStrapi({}, []);

    await webhooksProvider.bootstrap!(strapi);

    const load = webhookRunner.startReloadPolling.mock.calls[0][1] as () => Promise<unknown>;
    webhookStore.findWebhooks.mockClear();
    await load();

    expect(webhookStore.findWebhooks).toHaveBeenCalledTimes(1);
  });
});
