import { resolveGraphqlServerConfig } from '../resolve-graphql-server-config';

describe('resolveGraphqlServerConfig', () => {
  it('maps legacy apolloServer only to Apollo v4 with same options', () => {
    const resolved = resolveGraphqlServerConfig({
      apolloServer: { cors: true, tracing: false },
    });
    expect(resolved).toEqual({
      provider: 'apollo',
      version: 4,
      apolloOptions: { cors: true, tracing: false },
    });
  });

  it('treats empty apolloServer as empty options', () => {
    const resolved = resolveGraphqlServerConfig({
      apolloServer: {},
    });
    expect(resolved).toEqual({
      provider: 'apollo',
      version: 4,
      apolloOptions: {},
    });
  });

  it('treats missing apolloServer as empty options', () => {
    const resolved = resolveGraphqlServerConfig({
      endpoint: '/graphql',
    });
    expect(resolved).toEqual({
      provider: 'apollo',
      version: 4,
      apolloOptions: {},
    });
  });

  it('maps explicit server apollo v4 with options', () => {
    const resolved = resolveGraphqlServerConfig({
      apolloServer: { ignored: true },
      server: {
        provider: 'apollo',
        version: 4,
        options: { cors: false },
      },
    });
    expect(resolved).toEqual({
      provider: 'apollo',
      version: 4,
      apolloOptions: { cors: false },
    });
  });

  it('warns when both server and non-empty apolloServer are set', () => {
    const warns: string[] = [];
    resolveGraphqlServerConfig(
      {
        apolloServer: { cors: true },
        server: { provider: 'apollo', version: 4, options: {} },
      },
      { warn: (m) => warns.push(m) }
    );
    expect(warns.some((w) => w.includes('apolloServer') && w.includes('ignored'))).toBe(true);
  });

  it('does not warn when apolloServer is empty and server is set', () => {
    const warns: string[] = [];
    resolveGraphqlServerConfig(
      {
        apolloServer: {},
        server: { provider: 'apollo', version: 4 },
      },
      { warn: (m) => warns.push(m) }
    );
    expect(warns).toHaveLength(0);
  });

  it('defaults server.provider apollo to version 4 when version omitted', () => {
    const resolved = resolveGraphqlServerConfig({
      server: { provider: 'apollo', options: { foo: 1 } },
    });
    expect(resolved).toEqual({
      provider: 'apollo',
      version: 4,
      apolloOptions: { foo: 1 },
    });
  });

  it('selects Apollo v5 when version is 5', () => {
    const resolved = resolveGraphqlServerConfig({
      server: { provider: 'apollo', version: 5, options: { cache: 'bounded' } },
    });
    expect(resolved).toEqual({
      provider: 'apollo',
      version: 5,
      apolloOptions: { cache: 'bounded' },
    });
  });

  it('throws for tailcall with a clear message', () => {
    expect(() =>
      resolveGraphqlServerConfig({
        server: { provider: 'tailcall', options: {} },
      })
    ).toThrow(/tailcall.*not supported/);
  });
});
