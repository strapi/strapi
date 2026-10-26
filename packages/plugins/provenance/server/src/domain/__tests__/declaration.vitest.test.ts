import { describe, expect, it } from 'vitest';

import {
  claimForField,
  resolveBaseDeclaration,
  resolveFieldDeclaration,
  type RequestSnapshot,
} from '../declaration';

const snapshot = (overrides: Partial<RequestSnapshot> = {}): RequestSnapshot => ({
  headerClaim: null,
  bodyClaims: {},
  ...overrides,
});

describe('resolveBaseDeclaration', () => {
  it('has no signal outside of a request', () => {
    expect(resolveBaseDeclaration(null)).toEqual({
      origin: 'none',
      signal: 'none',
      actor: { type: 'system' },
    });
  });

  it('treats the Strapi MCP server as an AI channel', () => {
    expect(
      resolveBaseDeclaration(snapshot({ auditSource: 'mcp', strategy: undefined, userId: 3 }))
    ).toEqual({
      origin: 'ai',
      signal: 'strapi-channel',
      agent: 'strapi-mcp',
      actor: { type: 'admin-user', id: 3 },
    });
  });

  it('treats an admin session as a human', () => {
    expect(resolveBaseDeclaration(snapshot({ strategy: 'admin', userId: 1 }))).toEqual({
      origin: 'human',
      signal: 'admin-session',
      actor: { type: 'admin-user', id: 1 },
    });
  });

  it.each([
    ['agent', 'ai', 'token'],
    ['integration', 'automated', 'token'],
    ['mixed', 'none', 'none'],
    [null, 'none', 'none'],
  ] as const)('maps a %s token to %s', (profile, origin, signal) => {
    for (const strategy of ['admin-token', 'content-api-token']) {
      expect(
        resolveBaseDeclaration(snapshot({ strategy, tokenId: 7, tokenProfile: profile }))
      ).toEqual({ origin, signal, actor: { type: 'api-token', id: 7 } });
    }
  });

  it('keeps end users unattributed', () => {
    expect(resolveBaseDeclaration(snapshot({ strategy: 'users-permissions', userId: 9 }))).toEqual({
      origin: 'none',
      signal: 'none',
      actor: { type: 'end-user', id: 9 },
    });
  });
});

describe('resolveFieldDeclaration', () => {
  const human = resolveBaseDeclaration(snapshot({ strategy: 'admin', userId: 1 }));
  const agent = resolveBaseDeclaration(
    snapshot({ strategy: 'content-api-token', tokenId: 7, tokenProfile: 'agent' })
  );
  const integration = resolveBaseDeclaration(
    snapshot({ strategy: 'content-api-token', tokenId: 8, tokenProfile: 'integration' })
  );
  const unspecified = resolveBaseDeclaration(
    snapshot({ strategy: 'content-api-token', tokenId: 9 })
  );

  it('returns the base declaration without a claim', () => {
    expect(resolveFieldDeclaration(human, null)).toBe(human);
  });

  it('lets a client declare AI on an unspecified token', () => {
    expect(resolveFieldDeclaration(unspecified, { source: 'ai', model: 'm1' })).toEqual({
      origin: 'ai',
      signal: 'client-declared',
      actor: { type: 'api-token', id: 9 },
      edited: false,
      model: 'm1',
      agent: undefined,
    });
  });

  it('lets a client declare AI on an admin session or an integration token', () => {
    expect(resolveFieldDeclaration(human, { source: 'ai' }).origin).toBe('ai');
    expect(resolveFieldDeclaration(integration, { source: 'ai' }).origin).toBe('ai');
  });

  it('never lets a client lower an AI token to human', () => {
    expect(resolveFieldDeclaration(agent, { source: 'human' })).toBe(agent);
  });

  it('ignores claims that are not AI on other writes too', () => {
    expect(resolveFieldDeclaration(unspecified, { source: 'import' })).toBe(unspecified);
  });

  it('enriches an AI token with the claimed model, agent and action, keeping its signal', () => {
    expect(
      resolveFieldDeclaration(agent, { source: 'ai', model: 'm1', agent: 'bot', action: 'edited' })
    ).toEqual({
      origin: 'ai',
      signal: 'token',
      actor: { type: 'api-token', id: 7 },
      edited: true,
      model: 'm1',
      agent: 'bot',
    });
  });
});

describe('claimForField', () => {
  it('prefers the body claim of the field over the header', () => {
    const request = snapshot({
      headerClaim: { source: 'ai', model: 'header' },
      bodyClaims: { title: { source: 'ai', model: 'body' } },
    });

    expect(claimForField(request, 'title')).toEqual({ source: 'ai', model: 'body' });
    expect(claimForField(request, 'body')).toEqual({ source: 'ai', model: 'header' });
    expect(claimForField(null, 'title')).toBeNull();
  });

  it('does not let a body claim hide the AI declaration of the header', () => {
    const request = snapshot({
      headerClaim: { source: 'ai', model: 'header' },
      bodyClaims: { title: {}, body: { source: 'import' } },
    });

    expect(claimForField(request, 'title')?.source).toBe('ai');
    expect(claimForField(request, 'body')?.source).toBe('ai');
  });
});
