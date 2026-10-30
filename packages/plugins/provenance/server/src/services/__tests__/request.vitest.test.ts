import { describe, expect, it, vi } from 'vitest';

import { createRequestService, resolveAgentPrincipal } from '../request';

describe('resolveAgentPrincipal', () => {
  it('finds nobody on a person or token request', () => {
    expect(
      resolveAgentPrincipal({ auth: { strategy: { name: 'admin' } }, user: { id: 1 } })
    ).toBeNull();
    expect(
      resolveAgentPrincipal({
        auth: { strategy: { name: 'admin-token' }, credentials: { id: 3 } },
        user: { id: 1 },
      })
    ).toBeNull();
  });

  it('reads the agent auth strategy', () => {
    expect(
      resolveAgentPrincipal({
        auth: { strategy: { name: 'agent' } },
        user: { id: 9, kind: 'agent', firstname: 'Blog Drafter' },
      })
    ).toEqual({ id: 9, name: 'Blog Drafter' });
  });

  it('reads an admin user of kind agent, whatever the strategy', () => {
    expect(
      resolveAgentPrincipal({
        auth: { strategy: { name: 'admin' } },
        user: { id: 9, kind: 'agent', username: 'bot' },
      })
    ).toEqual({ id: 9, name: 'bot' });
  });

  it('reads the state set by the gateway of the plugin prototype', () => {
    expect(
      resolveAgentPrincipal({ agent: { id: 'doc1', name: 'SEO', clientId: 'ag_1', owner: 'x' } })
    ).toEqual({ id: 'doc1', name: 'SEO' });
  });
});

describe('request service', () => {
  const createService = (state: Record<string, unknown>, headers = {}) =>
    createRequestService({
      strapi: {
        requestContext: { get: () => ({ state, request: { headers, body: {} } }) },
      } as any,
      tokenProfiles: { get: vi.fn(async () => 'agent') } as any,
    });

  const reviewer = () => ({ auth: { strategy: { name: 'admin' } }, user: { id: 1 } });

  it('only reads token profiles for Content API tokens', async () => {
    const adminToken = createService({
      auth: { strategy: { name: 'admin-token' }, credentials: { id: 3 } },
      user: { id: 1 },
    });
    const contentApi = createService({
      auth: { strategy: { name: 'content-api-token' }, credentials: { id: 4 } },
    });

    expect((await adminToken.getSnapshot())?.tokenProfile).toBeNull();
    expect((await contentApi.getSnapshot())?.tokenProfile).toBe('agent');
  });

  it('attributes writes to the agent during an execution, then to the request again', async () => {
    const service = createService(reviewer(), { 'strapi-provenance': 'source=ai; agent="fake"' });
    const agent = { id: 12, name: 'Blog Drafter' };

    // Cached before the execution: must not leak into it
    expect((await service.getSnapshot())?.agent).toBeNull();

    const inside = await service.withExecution({ agent, claim: { model: 'm' } }, () =>
      service.getSnapshot()
    );

    expect(inside).toMatchObject({ agent, headerClaim: { model: 'm' }, strategy: 'admin' });
    expect((await service.getSnapshot())?.agent).toBeNull();
    expect((await service.getSnapshot())?.headerClaim).toMatchObject({ agent: 'fake' });
  });

  it('clears the execution when the action fails', async () => {
    const service = createService(reviewer());

    await expect(
      service.withExecution({ agent: { id: 1, name: 'a' } }, async () => {
        throw new Error('failed');
      })
    ).rejects.toThrow('failed');

    expect((await service.getSnapshot())?.agent).toBeNull();
  });
});
