import { describe, expect, it, vi } from 'vitest';
import webhooksProvider from '../webhooks';

const createMockStrapi = (webhooks: unknown[]) => {
  const runner = { add: vi.fn() };
  const store = { findWebhooks: vi.fn(async () => webhooks) };
  const get = vi.fn((name: string) => (name === 'webhookRunner' ? runner : store));

  return { strapi: { get } as any, runner, get };
};

describe('webhooks provider', () => {
  it('registers every saved webhook in the runner', async () => {
    const webhooks = [{ id: '1' }, { id: '2' }];
    const { strapi, runner } = createMockStrapi(webhooks);

    await webhooksProvider.bootstrap!(strapi);

    expect(runner.add.mock.calls).toEqual([[webhooks[0]], [webhooks[1]]]);
  });

  // Creating the runner reads `server.webhooks`, so an invalid configuration fails at startup
  it('creates the runner even when there are no webhooks', async () => {
    const { strapi, runner, get } = createMockStrapi([]);

    await webhooksProvider.bootstrap!(strapi);

    expect(get).toHaveBeenCalledWith('webhookRunner');
    expect(runner.add).not.toHaveBeenCalled();
  });
});
