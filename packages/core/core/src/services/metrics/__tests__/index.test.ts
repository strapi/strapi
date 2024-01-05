import { get } from 'lodash/fp';
import metrics from '../index';

const fetch = jest.fn(() => Promise.resolve());

describe('metrics', () => {
  beforeEach(() => {
    fetch.mockClear();
  });
  test('Initializes a middleware', () => {
    const use = jest.fn();

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
      fetch,
    } as any);

    metricsInstance.register();

    expect(use).toHaveBeenCalled();

    metricsInstance.destroy();
  });

  test('Does not init middleware if disabled', () => {
    const use = jest.fn();

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
      requestContext: {
        get: jest.fn(() => ({})),
      },
      fetch,
    } as any);

    send('someEvent');

    expect(fetch).not.toHaveBeenCalled();
  });
});
