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

const mockHistoryVersionCreate = jest.fn();

const mockStrapi = {
  admin: {
    services: {
      'persist-tables': { persistTablesWithPrefix: jest.fn() },
    },
  },
  service: jest.fn((name: string) => {
    if (name === 'admin::persist-tables') {
      return { persistTablesWithPrefix: jest.fn() };
    }
  }),
  plugins: {
    'content-manager': {
      services: {
        'document-metadata': {
          getMetadata: jest.fn().mockResolvedValue([]),
          getStatus: jest.fn(),
        },
      },
    },
    i18n: {
      services: {
        locales: {
          getDefaultLocale: jest.fn().mockReturnValue('en'),
          find: jest.fn().mockResolvedValue([]),
        },
        'content-types': {
          isLocalizedContentType: jest.fn().mockReturnValue(false),
        },
      },
    },
  },
  // @ts-expect-error - Ignore
  plugin: (plugin: string) => mockStrapi.plugins[plugin],
  db: {
    query(uid: UID.ContentType) {
      if (uid === HISTORY_VERSION_UID) {
        return {
          create: mockHistoryVersionCreate,
        };
      }
      return { findMany: jest.fn().mockResolvedValue([]) };
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
  getModel: jest.fn(() => ({ attributes: {} })),
  contentTypes: {
    'api::article.article': { options: { draftAndPublish: true } },
  },
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

// shouldCreateHistoryVersion reads from the global `strapi`, not the param.
// @ts-expect-error - global strapi
global.strapi = mockStrapi;

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

  describe('publish dedup guard', () => {
    // The middleware suppresses the `update` history version that the publish
    // action emits as a side-effect on the draft, so users see one version per
    // publish. The guard checks the request URL — query strings (e.g. `?locale=en`
    // for i18n) must not break it. Issue #25724.
    let useMiddleware: (context: any, next: () => Promise<any>) => Promise<any>;

    beforeAll(async () => {
      await lifecyclesService.bootstrap();
      // @ts-expect-error - mock
      useMiddleware = mockStrapi.documents.use.mock.calls[0][0];
    });

    beforeEach(() => {
      mockHistoryVersionCreate.mockClear();
    });

    const callMiddleware = async (url: string) => {
      mockGetRequestContext.mockReturnValue({
        state: { user: { id: '123' } },
        request: { url },
      });

      await useMiddleware(
        {
          action: 'update',
          contentType: { uid: 'api::article.article' },
          params: { documentId: 'doc-1', locale: 'en' },
        },
        async () => ({ documentId: 'doc-1' })
      );
    };

    it('skips creating a history version when URL ends with /actions/publish', async () => {
      await callMiddleware(
        '/content-manager/collection-types/api::article.article/doc-1/actions/publish'
      );
      expect(mockHistoryVersionCreate).not.toHaveBeenCalled();
    });

    it('skips creating a history version when URL has /actions/publish followed by query params', async () => {
      await callMiddleware(
        '/content-manager/collection-types/api::article.article/doc-1/actions/publish?locale=en'
      );
      expect(mockHistoryVersionCreate).not.toHaveBeenCalled();
    });
  });
});
