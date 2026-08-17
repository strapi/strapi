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

  it.each([
    [{ maxLimit: -1 }, 'depthLimit, maxLimit'],
    [{ depthLimit: undefined, maxLimit: 100 }, 'depthLimit'],
    [{ depthLimit: null, maxLimit: 100 }, 'depthLimit'],
    [{ depthLimit: 0, maxLimit: 100 }, 'depthLimit'],
    [{ depthLimit: -1, maxLimit: 100 }, 'depthLimit'],
    [{ depthLimit: Number.NaN, maxLimit: 100 }, 'depthLimit'],
    [{ depthLimit: Number.POSITIVE_INFINITY, maxLimit: 100 }, 'depthLimit'],
    [{ depthLimit: 10, maxLimit: -1 }, 'maxLimit'],
  ])('warns for unbounded built-in %s', (config, keys) => {
    const warning = getOperationLimitsWarning(config);

    expect(warning).toContain(`unbounded for: ${keys}.`);
    expect(warning).toContain(recommendation);
    expect(warning).toContain(customRulesNote);
    expect(warning).toContain('https://docs.strapi.io/cms/configurations/plugins');
  });

  it('does not warn when both built-in limits are bounded', () => {
    expect(getOperationLimitsWarning({ depthLimit: 10, maxLimit: 100 })).toBeUndefined();
  });

  it('still warns when custom Apollo validation rules are present', () => {
    const warning = getOperationLimitsWarning({
      depthLimit: undefined,
      maxLimit: -1,
      apolloServer: { validationRules: [jest.fn()] },
    });

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

  it('logs one warning before constructing Apollo when both built-in limits are unbounded', async () => {
    const operationWarning = jest.fn((message: string) => {
      if (message.startsWith('Built-in GraphQL operation limits')) {
        mockEvents.push('operation-warning');
      }
    });
    const plugin = {
      config: jest.fn((key: string) => {
        const config = {
          endpoint: '/graphql',
          depthLimit: undefined,
          maxLimit: -1,
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

    await bootstrap({ strapi: strapi as unknown as Core.Strapi });

    expect(operationWarning).toHaveBeenCalledTimes(1);
    expect(operationWarning).toHaveBeenCalledWith(expect.stringContaining('depthLimit, maxLimit'));
    expect(mockApolloServer).toHaveBeenCalledTimes(1);
    expect(mockApolloServerStart).toHaveBeenCalledTimes(1);
    expect(mockEvents).toEqual(['operation-warning', 'apollo-construction', 'apollo-start']);
  });
});
