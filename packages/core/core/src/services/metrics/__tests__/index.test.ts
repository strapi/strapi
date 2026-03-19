import { get } from 'lodash/fp';
import metrics from '../index';

const fetch = jest.fn(() => Promise.resolve());

describe('metrics', () => {
  beforeEach(() => {
    fetch.mockClear();
  });
  test('Initializes a middleware', () => {
    const use = jest.fn();
    const add = jest.fn();

    const metricsInstance = metrics({
      config: {
        get(path: string | string[]) {
          return get(path, this);
        },
        uuid: 'test',
        environment: 'dev',
        info: {
          strapi: '0.0.0',
        },
      },
      server: {
        use,
      },
      dirs: {
        app: {
          root: process.cwd(),
        },
      },
      requestContext: {
        get: jest.fn(() => ({})),
      },
      cron: {
        add,
      },
      fetch,
    } as any);

    metricsInstance.register();

    expect(use).toHaveBeenCalled();

    metricsInstance.destroy();
  });

  test('Does not init middleware if disabled', () => {
    const use = jest.fn();
    const add = jest.fn();

    const metricsInstance = metrics({
      config: {
        get(path: string | string[]) {
          return get(path, this);
        },
        uuid: false,
        environment: 'dev',
        info: {
          strapi: '0.0.0',
        },
      },
      server: {
        use,
      },
      dirs: {
        app: {
          root: process.cwd(),
        },
      },
      requestContext: {
        get: jest.fn(() => ({})),
      },
      cron: {
        add,
      },
      fetch,
    } as any);

    metricsInstance.register();

    expect(use).not.toHaveBeenCalled();

    metricsInstance.destroy();
  });

  test('Send payload with meta', () => {
    const { send } = metrics({
      config: {
        get(path: string | string[]) {
          return get(path, this);
        },
        uuid: 'test',
        environment: 'dev',
        info: {
          strapi: '0.0.0',
        },
      },
      server: {
        use() {},
      },
      dirs: {
        app: {
          root: process.cwd(),
        },
      },
      requestContext: {
        get: jest.fn(() => ({})),
      },
      cron: {
        add: jest.fn(),
      },
      fetch,
    } as any);

    send('someEvent');

    expect(fetch).toHaveBeenCalled();

    const callParameters = fetch.mock.calls[0] as any[];
    expect(callParameters[0]).toBe('https://analytics.strapi.io/api/v2/track');

    expect(callParameters[1].method).toBe('POST');
    expect(JSON.parse(callParameters[1].body)).toMatchObject({
      event: 'someEvent',
      groupProperties: {
        projectType: 'Community',
        projectId: 'test',
      },
    });
    expect(callParameters[1].headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Strapi-Event': 'someEvent',
    });

    fetch.mockClear();
  });

  test('Does not send payload when disabled', () => {
    const { send } = metrics({
      config: {
        get(path: string | string[]) {
          return get(path, this);
        },
        uuid: false,
        packageJsonStrapi: {},
        environment: 'dev',
        info: {
          strapi: '0.0.0',
        },
      },
      server: {
        use() {},
      },
      dirs: {
        app: {
          root: process.cwd(),
        },
      },
      cron: {
        add: jest.fn(),
      },
      requestContext: {
        get: jest.fn(() => ({})),
      },
      fetch,
    } as any);

    send('someEvent');

    expect(fetch).not.toHaveBeenCalled();
  });

  test('Includes EE subscription info when present', () => {
    const { send } = metrics({
      config: {
        get(path: string | string[]) {
          return get(path, this);
        },
        uuid: 'test',
        environment: 'dev',
        info: {
          strapi: '0.0.0',
        },
      },
      server: {
        use() {},
      },
      dirs: {
        app: {
          root: process.cwd(),
        },
      },
      requestContext: {
        get: jest.fn(() => ({})),
      },
      cron: {
        add: jest.fn(),
      },
      fetch,
      EE: true,
      ee: {
        subscriptionId: 'sub_123',
        planPriceId: 'price_abc',
      },
    } as any);

    send('someEvent');

    expect(fetch).toHaveBeenCalled();

    const callParameters = fetch.mock.calls[0] as any[];
    const body = JSON.parse(callParameters[1].body);
    expect(body.groupProperties).toMatchObject({
      projectType: 'Enterprise',
      projectId: 'test',
      subscriptionId: 'sub_123',
      planPriceId: 'price_abc',
    });

    fetch.mockClear();
  });

  test('Does not include EE fields when absent', () => {
    const { send } = metrics({
      config: {
        get(path: string | string[]) {
          return get(path, this);
        },
        uuid: 'test',
        environment: 'dev',
        info: {
          strapi: '0.0.0',
        },
      },
      server: {
        use() {},
      },
      dirs: {
        app: {
          root: process.cwd(),
        },
      },
      requestContext: {
        get: jest.fn(() => ({})),
      },
      cron: {
        add: jest.fn(),
      },
      fetch,
      EE: false,
    } as any);

    send('someEvent');

    expect(fetch).toHaveBeenCalled();

    const callParameters = fetch.mock.calls[0] as any[];
    const body = JSON.parse(callParameters[1].body);
    expect(body.groupProperties).toMatchObject({
      projectType: 'Community',
      projectId: 'test',
    });
    expect(body.groupProperties.subscriptionId).toBeUndefined();
    expect(body.groupProperties.planPriceId).toBeUndefined();

    fetch.mockClear();
  });
});
