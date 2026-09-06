import { ApolloServer } from '@apollo/server';
import type { Core } from '@strapi/types';

import { bootstrap, getOperationLimitsWarning } from '../bootstrap';

jest.mock('@apollo/server', () => ({
  ApolloServer: jest.fn(),
}));

jest.mock('@as-integrations/koa', () => ({
  koaMiddleware: jest.fn(() => jest.fn()),
}));

const mockApolloServer = jest.mocked(ApolloServer);

describe('getOperationLimitsWarning', () => {
  const recommendation = 'defaultLimit: 25, maxLimit: 100, depthLimit: 10';
  const customRulesNote = 'Custom Apollo validation rules may independently enforce limits.';
  const documentationUrl = 'https://docs.strapi.io/cms/configurations/plugins';

  it.each([
    [{ depthLimit: 10, maxLimit: -1 }, 'maxLimit'],
    [{ depthLimit: 10, maxLimit: undefined }, 'maxLimit'],
    [{ depthLimit: 10, maxLimit: null }, 'maxLimit'],
    [{ depthLimit: 10, maxLimit: Number.NaN }, 'maxLimit'],
    [{ depthLimit: 10, maxLimit: Number.POSITIVE_INFINITY }, 'maxLimit'],
    [{ depthLimit: 10, maxLimit: Number.NEGATIVE_INFINITY }, 'maxLimit'],
    [{ depthLimit: 10, maxLimit: 0 }, 'maxLimit'],
    [{ depthLimit: 10, maxLimit: -2 }, 'maxLimit'],
    [{ depthLimit: undefined, maxLimit: 100 }, 'depthLimit'],
    [{ depthLimit: null, maxLimit: 100 }, 'depthLimit'],
    [{ depthLimit: Number.NaN, maxLimit: 100 }, 'depthLimit'],
    [{ depthLimit: Number.POSITIVE_INFINITY, maxLimit: 100 }, 'depthLimit'],
    [{ depthLimit: Number.NEGATIVE_INFINITY, maxLimit: 100 }, 'depthLimit'],
    [{ depthLimit: 0, maxLimit: 100 }, 'depthLimit'],
    [{ depthLimit: -1, maxLimit: 100 }, 'depthLimit'],
  ])('warns for unbounded or invalid built-in limits: %s', (config, keys) => {
    const warning = getOperationLimitsWarning(config);

    expect(warning).toContain(`unbounded or invalid for: ${keys}.`);
    expect(warning).toContain(recommendation);
    expect(warning).toContain(customRulesNote);
    expect(warning).toContain(documentationUrl);
  });

  it.each([1, 100, Number.MAX_SAFE_INTEGER])(
    'does not warn when maxLimit is a bounded positive value: %s',
    (maxLimit) => {
      expect(getOperationLimitsWarning({ depthLimit: 10, maxLimit })).toBeUndefined();
    }
  );

  it('still warns when custom Apollo validation rules are present', () => {
    const configWithCustomRules = {
      depthLimit: undefined,
      maxLimit: -1,
      apolloServer: { validationRules: [jest.fn()] },
    };
    const warning = getOperationLimitsWarning(configWithCustomRules);

    expect(warning).toContain('depthLimit, maxLimit');
    expect(warning).toContain(recommendation);
    expect(warning).toContain(customRulesNote);
  });
});

describe('bootstrap operation-limit warning', () => {
  const mockEvents: string[] = [];
  const mockApolloServerStart = jest.fn();

  beforeEach(() => {
    mockEvents.length = 0;
    mockApolloServer.mockClear();
    mockApolloServerStart.mockClear();
    mockApolloServerStart.mockImplementation(async () => {
      mockEvents.push('apollo-start');
    });
    mockApolloServer.mockImplementation(() => {
      mockEvents.push('apollo-construction');

      return {
        start: mockApolloServerStart,
        stop: jest.fn(),
      } as any;
    });
  });

  const createStrapi = ({ depthLimit, maxLimit }: { depthLimit: unknown; maxLimit: unknown }) => {
    const operationWarning = jest.fn((message: string) => {
      if (message.startsWith('Built-in GraphQL operation limits')) {
        mockEvents.push('operation-warning');
      }
    });
    const plugin = {
      config: jest.fn((key: string) => {
        const config = {
          endpoint: '/graphql',
          depthLimit,
          maxLimit,
          landingPage: false,
          apolloServer: undefined,
        };

        return config[key as keyof typeof config];
      }),
      service: jest.fn((name: string) => {
        if (name === 'content-api') {
          return { buildSchema: jest.fn(() => ({ type: 'schema' })) };
        }

        return { playground: { setEnabled: jest.fn() } };
      }),
    };
    const strapi = {
      plugin: jest.fn(() => plugin),
      log: {
        warn: operationWarning,
        debug: jest.fn(),
        error: jest.fn(),
      },
      server: { routes: jest.fn() },
      auth: { authenticate: jest.fn() },
    };

    return { strapi: strapi as unknown as Core.Strapi, operationWarning };
  };

  it('logs one warning before constructing Apollo when both built-in limits are unbounded', async () => {
    const { strapi, operationWarning } = createStrapi({ depthLimit: undefined, maxLimit: -1 });

    await bootstrap({ strapi });

    expect(operationWarning).toHaveBeenCalledTimes(1);
    expect(operationWarning).toHaveBeenCalledWith(expect.stringContaining('depthLimit, maxLimit'));
    expect(mockApolloServer).toHaveBeenCalledTimes(1);
    expect(mockApolloServerStart).toHaveBeenCalledTimes(1);
    expect(mockEvents).toEqual(['operation-warning', 'apollo-construction', 'apollo-start']);
  });

  it('does not log an operation-limit warning when both built-in limits are bounded', async () => {
    const { strapi, operationWarning } = createStrapi({ depthLimit: 10, maxLimit: 100 });

    await bootstrap({ strapi });

    expect(operationWarning).not.toHaveBeenCalledWith(
      expect.stringContaining('Built-in GraphQL operation limits')
    );
  });

  it.each([
    { depthLimit: undefined, maxLimit: 100 },
    { depthLimit: 10, maxLimit: 0 },
  ])(
    'logs one operation-limit warning when exactly one control is unbounded or invalid',
    async (limits) => {
      const { strapi, operationWarning } = createStrapi(limits);

      await bootstrap({ strapi });

      expect(operationWarning).toHaveBeenCalledTimes(1);
      expect(operationWarning).toHaveBeenCalledWith(
        expect.stringContaining('Built-in GraphQL operation limits')
      );
    }
  );
});
