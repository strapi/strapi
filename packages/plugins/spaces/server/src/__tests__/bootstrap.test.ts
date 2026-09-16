import bootstrap from '../bootstrap';

interface Options {
  migrateOnBootstrap?: boolean;
}

const makeStrapi = ({ migrateOnBootstrap = true }: Options = {}) => {
  /** Everything the bootstrap set up, in the order it did. */
  const installed: string[] = [];

  const strapi = {
    requestContext: { get: () => undefined },
    config: {
      get: (key: string, fallback: unknown) =>
        key === 'plugin::spaces.migrateOnBootstrap' ? migrateOnBootstrap : fallback,
    },
    get(name: string) {
      if (name === 'auth') {
        return {
          onAuthenticated: () => installed.push('request scope'),
        };
      }

      return { webhookRunner: {}, webhookStore: { findWebhooks: () => [] } }[name];
    },
    documents: { use: () => installed.push('document service') },
    eventHub: { emit: jest.fn() },
    db: {
      lifecycles: {
        subscribe: (subscriber: { models?: string[] }) =>
          installed.push(subscriber.models ? `lifecycles:${subscriber.models.join()}` : 'stamping'),
      },
      queryScopes: { register: () => installed.push('query scope') },
      metadata: { has: () => false },
    },
    plugin: () => undefined,
    service: (uid: string) =>
      ({
        'plugin::spaces.permissions': { installRoleScope: () => installed.push('role scope') },
        'plugin::spaces.migration': { run: async () => installed.push('migration') },
      })[uid],
  } as never;

  return { strapi, installed };
};

describe('starting the plugin up', () => {
  it('has the role scope in place before any request is served', async () => {
    const { strapi, installed } = makeStrapi();

    await bootstrap({ strapi });

    expect(installed[0]).toBe('role scope');
  });

  it('settles a request’s space before any policy or controller runs', async () => {
    // Hooked onto authentication, so no request reaches the database without
    // an answer to "which space?" — anonymous content API callers included.
    const { strapi, installed } = makeStrapi();

    await bootstrap({ strapi });

    expect(installed).toContain('request scope');
    expect(installed.indexOf('request scope')).toBeLessThan(installed.indexOf('query scope'));
  });

  it('installs the query scope, which is the boundary', async () => {
    const { strapi, installed } = makeStrapi();

    await bootstrap({ strapi });

    expect(installed).toContain('query scope');
  });

  it('installs write stamping and the document service middleware', async () => {
    const { strapi, installed } = makeStrapi();

    await bootstrap({ strapi });

    expect(installed).toContain('stamping');
    expect(installed).toContain('document service');
  });

  it('assigns existing content once everything else is in place', async () => {
    // The migration writes through the same path it just installed.
    const { strapi, installed } = makeStrapi();

    await bootstrap({ strapi });

    expect(installed[installed.length - 1]).toBe('migration');
  });

  it('leaves the migration to be run deliberately when asked to', async () => {
    const { strapi, installed } = makeStrapi({ migrateOnBootstrap: false });

    await bootstrap({ strapi });

    expect(installed).not.toContain('migration');
    expect(installed).toContain('query scope');
  });
});
