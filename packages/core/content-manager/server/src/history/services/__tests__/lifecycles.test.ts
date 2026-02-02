import type { UID } from '@strapi/types';
import { HISTORY_VERSION_UID } from '../../constants';
import { createLifecyclesService } from '../lifecycles';

const mockGetRequestContext = jest.fn(() => {
  return {
    state: {
      user: {
        id: '123',
      },
    },
    request: {
      url: '/content-manager/test',
    },
  };
});

const mockStrapi = {
  service: jest.fn((name: string) => {
    if (name === 'admin::persist-tables') {
      return { persistTablesWithPrefix: jest.fn() };
    }
  }),
  plugins: {
    'content-manager': {
      service: jest.fn(() => ({
        getMetadata: jest.fn().mockResolvedValue([]),
        getStatus: jest.fn(),
      })),
    },
    i18n: {
      service: jest.fn(() => ({
        getDefaultLocale: jest.fn().mockReturnValue('en'),
      })),
    },
  },
  // @ts-expect-error - Ignore
  plugin: (plugin: string) => mockStrapi.plugins[plugin],
  db: {
    query(uid: UID.ContentType) {
      if (uid === HISTORY_VERSION_UID) {
        return {
          create: jest.fn(),
        };
      }
    },
    transaction(cb: any) {
      const opt = {
        onCommit(func: any) {
          return func();
        },
      };
      return cb(opt);
    },
  },
  ee: {
    features: {
      isEnabled: jest.fn().mockReturnValue(false),
      get: jest.fn(),
    },
  },
  documents: jest.fn(() => ({
    findOne: jest.fn(),
  })),
  requestContext: {
    get: mockGetRequestContext,
  },
  config: {
    get: () => undefined,
  },
  cron: {
    add: jest.fn(),
  },
};
// @ts-expect-error - ignore
mockStrapi.documents.use = jest.fn();

// @ts-expect-error - we're not mocking the full Strapi object
const lifecyclesService = createLifecyclesService({ strapi: mockStrapi });

describe('history lifecycles service', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('inits service only once', async () => {
    await lifecyclesService.bootstrap();
    await lifecyclesService.bootstrap();
    // @ts-expect-error - ignore
    expect(mockStrapi.documents.use).toHaveBeenCalledTimes(1);
  });

  it('should create a cron job that runs once a day', async () => {
    await lifecyclesService.bootstrap();

    expect(mockStrapi.cron.add).toHaveBeenCalledTimes(1);
    expect(mockStrapi.cron.add).toHaveBeenCalledWith(
      expect.objectContaining({
        deleteHistoryDaily: expect.objectContaining({
          task: expect.any(Function),
        }),
      })
    );
  });
});
