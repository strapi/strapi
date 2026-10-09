import type { UID } from '@strapi/types';
import { HISTORY_VERSION_UID } from '../../constants';
import { createLifecyclesService } from '../lifecycles';

const contentManagerRoute = { info: { pluginName: 'content-manager', type: 'admin' } };

const mockGetRequestContext = jest.fn(
  (): { state: Record<string, unknown>; request: { url: string } } => {
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
  }
);

const mockHistoryVersionCreate = jest.fn();
const mockFindMany = jest.fn().mockResolvedValue([]);
const mockCreateVersion = jest.fn();
const mockDocumentMetadata = {
  getMetadata: jest.fn().mockResolvedValue({ availableStatus: [] }),
  getStatus: jest.fn(),
};
const mockConfigGet = jest.fn();
const mockLogError = jest.fn();
const mockLogDebug = jest.fn();
const pendingCommitCallbacks: Promise<void>[] = [];

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
    if (name === 'plugin::content-manager.history') {
      return { createVersion: mockCreateVersion };
    }
  }),
  plugins: {
    'content-manager': {
      service: () => mockDocumentMetadata,
      services: {
        'document-metadata': mockDocumentMetadata,
      },
    },
  },
  localization: {
    getDefaultLocale: jest.fn().mockResolvedValue('en'),
    getLocales: jest.fn().mockResolvedValue([]),
    isLocalizedContentType: jest.fn().mockReturnValue(false),
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
      return { findMany: mockFindMany };
    },
    transaction(cb: any) {
      const opt = {
        onCommit(func: () => Promise<void>) {
          pendingCommitCallbacks.push(func());
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
    get: mockConfigGet,
  },
  log: {
    error: mockLogError,
    debug: mockLogDebug,
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

  describe('publish dedup guard', () => {
    // The middleware suppresses the `update` history version that the publish
    // action emits as a side-effect on the draft, so users see one version per
    // publish. The guard checks the matched route path, so query strings (e.g. `?locale=en`
    // for i18n) cannot break it. Issue #25724.
    let useMiddleware: (context: any, next: () => Promise<any>) => Promise<any>;

    beforeAll(async () => {
      await lifecyclesService.bootstrap();
      // @ts-expect-error - mock
      useMiddleware = mockStrapi.documents.use.mock.calls[0][0];
    });

    beforeEach(() => {
      mockCreateVersion.mockReset();
      mockFindMany.mockResolvedValue([{ id: 1, locale: 'en' }]);
      mockConfigGet.mockImplementation(() => false);
    });

    const callMiddleware = async (routePath: string) => {
      mockGetRequestContext.mockReturnValue({
        state: { user: { id: '123' }, route: { ...contentManagerRoute, path: routePath } },
        request: { url: '/content-manager/anything?locale=en' },
      });

      await useMiddleware(
        {
          action: 'update',
          contentType: { uid: 'api::article.article' },
          params: { documentId: 'doc-1', locale: 'en' },
        },
        async () => ({ documentId: 'doc-1' })
      );
      await Promise.all(pendingCommitCallbacks.splice(0));
    };

    it.each([
      '/collection-types/:model/:id/actions/publish',
      '/collection-types/:model/actions/publish',
      '/single-types/:model/actions/publish',
    ])('skips creating a history version on the %s route', async (routePath) => {
      await callMiddleware(routePath);
      expect(mockCreateVersion).not.toHaveBeenCalled();
    });

    it('creates a history version on a Content Manager update route', async () => {
      await callMiddleware('/collection-types/:model/:id');
      expect(mockCreateVersion).toHaveBeenCalledTimes(1);
    });
  });

  describe('origin gate', () => {
    let useMiddleware: (context: any, next: () => Promise<any>) => Promise<any>;

    const contentApiRequestContext = {
      state: { route: { info: { type: 'content-api' } } },
      request: { url: '/api/articles' },
    };
    const contentManagerRequestContext = {
      state: { user: { id: '123' }, route: contentManagerRoute },
      request: { url: '/content-manager/collection-types/api::article.article' },
    };
    const otherAdminRequestContext = {
      state: {
        user: { id: '123' },
        route: { info: { pluginName: 'content-releases', type: 'admin' } },
      },
      request: { url: '/content-releases/1/actions/publish' },
    };

    const writeArticle = async () => {
      const result = await useMiddleware(
        {
          action: 'create',
          contentType: { uid: 'api::article.article' },
          params: { locale: 'en' },
        },
        async () => ({ documentId: 'doc-1' })
      );
      await Promise.all(pendingCommitCallbacks.splice(0));

      return result;
    };

    beforeAll(async () => {
      await lifecyclesService.bootstrap();
      // @ts-expect-error - mock
      useMiddleware = mockStrapi.documents.use.mock.calls[0][0];
    });

    beforeEach(() => {
      mockCreateVersion.mockReset();
      mockLogError.mockClear();
      mockLogDebug.mockClear();
      mockFindMany.mockResolvedValue([{ id: 1, locale: 'en' }]);
      mockConfigGet.mockImplementation(() => false);
    });

    const enableContentApiHistory = () => mockConfigGet.mockImplementation(() => true);

    it('creates a version for a Content Manager write', async () => {
      mockGetRequestContext.mockReturnValue(contentManagerRequestContext as any);

      await writeArticle();

      expect(mockCreateVersion).toHaveBeenCalledTimes(1);
    });

    it('ignores a content API write when the flag is off', async () => {
      mockGetRequestContext.mockReturnValue(contentApiRequestContext as any);

      await writeArticle();

      expect(mockCreateVersion).not.toHaveBeenCalled();
    });

    it('creates a version for a content API write when the flag is on', async () => {
      enableContentApiHistory();
      mockGetRequestContext.mockReturnValue(contentApiRequestContext as any);

      await writeArticle();

      expect(mockCreateVersion).toHaveBeenCalledTimes(1);
    });

    it('ignores a write from another admin route even when the flag is on', async () => {
      enableContentApiHistory();
      mockGetRequestContext.mockReturnValue(otherAdminRequestContext as any);

      await writeArticle();

      expect(mockCreateVersion).not.toHaveBeenCalled();
    });

    it('ignores a write without request context even when the flag is on', async () => {
      enableContentApiHistory();
      mockGetRequestContext.mockReturnValue(undefined as any);

      await writeArticle();

      expect(mockCreateVersion).not.toHaveBeenCalled();
    });

    it('logs the error and keeps the write when creating a version fails', async () => {
      const error = new Error('insert failed');
      mockCreateVersion.mockRejectedValue(error);
      mockGetRequestContext.mockReturnValue(contentManagerRequestContext as any);

      await expect(writeArticle()).resolves.toEqual({ documentId: 'doc-1' });

      expect(mockLogError).toHaveBeenCalledWith(expect.any(String), error);
      expect(mockLogDebug).toHaveBeenCalledWith(error);
    });

    it('keeps the write when a step before the insert fails', async () => {
      const error = new Error('populate failed');
      mockFindMany.mockRejectedValue(error);
      mockGetRequestContext.mockReturnValue(contentManagerRequestContext as any);

      await expect(writeArticle()).resolves.toEqual({ documentId: 'doc-1' });

      expect(mockLogError).toHaveBeenCalledWith(expect.any(String), error);
      expect(mockLogDebug).toHaveBeenCalledWith(error);
      expect(mockCreateVersion).not.toHaveBeenCalled();
    });
  });
});
