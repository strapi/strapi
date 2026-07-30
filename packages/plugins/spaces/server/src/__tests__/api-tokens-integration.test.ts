import { decideTokenWorkspaceAccess } from '../api-tokens-integration';

describe('decideTokenWorkspaceAccess', () => {
  it('lets an unbound token behave platform-wide (header optional)', () => {
    expect(decideTokenWorkspaceAccess([], undefined)).toEqual({ kind: 'allow' });
    expect(decideTokenWorkspaceAccess([], 'acme')).toEqual({ kind: 'allow' });
  });

  it('allows a bound token inside its workspaces', () => {
    expect(decideTokenWorkspaceAccess(['acme'], 'acme')).toEqual({ kind: 'allow' });
    expect(decideTokenWorkspaceAccess(['acme', 'default'], 'default')).toEqual({ kind: 'allow' });
  });

  it('denies a bound token outside its workspaces — the header grants nothing', () => {
    const decision = decideTokenWorkspaceAccess(['acme'], 'default');
    expect(decision.kind).toBe('deny');
    expect((decision as { reason: string }).reason).toContain('"default"');
  });

  it('auto-scopes a single-workspace token when no header is sent', () => {
    expect(decideTokenWorkspaceAccess(['acme'], undefined)).toEqual({
      kind: 'auto',
      slug: 'acme',
    });
  });

  it('requires an explicit header for a multi-workspace token', () => {
    const decision = decideTokenWorkspaceAccess(['acme', 'default'], undefined);
    expect(decision.kind).toBe('deny');
    expect((decision as { reason: string }).reason).toContain('X-Strapi-Space-Id');
  });
});
