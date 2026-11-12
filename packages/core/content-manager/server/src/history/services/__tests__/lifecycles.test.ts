import type { UID } from '@strapi/types';
import { HISTORY_VERSION_UID } from '../../constants';
import { createLifecyclesService } from '../lifecycles';

jest.mock('../../utils', () => ({
  getService: () => ({ createVersion: mockCreateVersion }),
}));

const mockGetRequestContext = jest.fn<unknown, []>();
const mockCreateVersion = jest.fn();
const mockFindEntries = jest.fn().mockResolvedValue([]);
const mockLogError = jest.fn();
const commitCallbacks: Promise<unknown>[] = [];

const mockDocumentMetadata = {
  getMetadata: jest.fn().mockResolvedValue([]),
  getStatus: jest.fn(),
};

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
          create: jest.fn(),
        };
      }
      return {
        findMany: mockFindEntries,
        findOne: jest.fn().mockResolvedValue({ documentId: 'admin-document-id' }),
      };
    },
    transaction(cb: any) {
      const opt = {
        onCommit(func: any) {
          commitCallbacks.push(func());
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
  log: {
    error: mockLogError,
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

  describe('version middleware', () => {
    let useMiddleware: (context: any, next: () => Promise<any>) => Promise<any>;

    const mockRequest = ({
      url = '/content-manager/collection-types/api::article.article/doc-1',
      pluginName = 'content-manager',
    } = {}) => {
      mockGetRequestContext.mockReturnValue({
        state: {
          user: { id: '123' },
          route: { info: { pluginName, type: 'admin' } },
          auth: { strategy: { name: 'admin' } },
        },
        request: { url },
      });
    };

    const updateArticle = async (
      locale: string | string[] = 'en',
      uid = 'api::article.article'
    ) => {
      const result = await useMiddleware(
        {
          action: 'update',
          contentType: { uid },
          params: { documentId: 'doc-1', locale },
        },
        async () => ({ documentId: 'doc-1' })
      );
      await Promise.all(commitCallbacks);

      return result;
    };

    beforeAll(async () => {
      await lifecyclesService.bootstrap();
      // @ts-expect-error - mock
      useMiddleware = mockStrapi.documents.use.mock.calls[0][0];
    });

    beforeEach(() => {
      commitCallbacks.length = 0;
      mockLogError.mockClear();
      mockCreateVersion.mockReset();
      mockFindEntries.mockReset().mockResolvedValue([{ id: 1, documentId: 'doc-1', locale: 'en' }]);
      mockRequest();
    });

    describe('recording gate', () => {
      it('records the write with its origin', async () => {
        await updateArticle();

        expect(mockCreateVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            locale: 'en',
            source: 'admin-panel',
            author: { type: 'person', model: 'admin::user', id: 'admin-document-id' },
          })
        );
      });

      it('records nothing when the write has no origin', async () => {
        mockRequest({ pluginName: 'admin' });

        await updateArticle();

        expect(mockCreateVersion).not.toHaveBeenCalled();
      });
    });

    describe('content types outside the api namespace', () => {
      it('records nothing for a plugin content type', async () => {
        await updateArticle('en', 'plugin::users-permissions.user');

        expect(mockCreateVersion).not.toHaveBeenCalled();
      });
    });

    describe('publish dedup guard', () => {
      // The middleware suppresses the `update` history version that the publish
      // action emits as a side-effect on the draft, so users see one version per
      // publish. The guard checks the request URL — query strings (e.g. `?locale=en`
      // for i18n) must not break it. Issue #25724.
      it('skips creating a history version when URL ends with /actions/publish', async () => {
        mockRequest({
          url: '/content-manager/collection-types/api::article.article/doc-1/actions/publish',
        });

        await updateArticle();

        expect(mockCreateVersion).not.toHaveBeenCalled();
      });

      it('skips creating a history version when URL has /actions/publish followed by query params', async () => {
        mockRequest({
          url: '/content-manager/collection-types/api::article.article/doc-1/actions/publish?locale=en',
        });

        await updateArticle();

        expect(mockCreateVersion).not.toHaveBeenCalled();
      });
    });

    describe('fail-open on the version insert', () => {
      it('logs the error and does not reject when the history version fails to save', async () => {
        const error = new Error('insert failed');
        mockCreateVersion.mockRejectedValueOnce(error);

        const result = await updateArticle();

        expect(result).toEqual({ documentId: 'doc-1' });
        expect(mockCreateVersion).toHaveBeenCalledTimes(1);
        expect(mockLogError).toHaveBeenCalledWith(
          'Failed to create a history version for api::article.article',
          { documentId: 'doc-1', locale: 'en', error }
        );
      });

      it('still saves the versions of the other locales when one fails', async () => {
        const error = new Error('insert failed');
        mockFindEntries.mockResolvedValue([
          { id: 1, documentId: 'doc-1', locale: 'en' },
          { id: 2, documentId: 'doc-1', locale: 'fr' },
        ]);
        mockCreateVersion.mockRejectedValueOnce(error).mockResolvedValueOnce(undefined);

        await updateArticle(['en', 'fr']);

        expect(mockCreateVersion).toHaveBeenCalledTimes(2);
        expect(mockCreateVersion).toHaveBeenLastCalledWith(
          expect.objectContaining({ locale: 'fr' })
        );
        expect(mockLogError).toHaveBeenCalledTimes(1);
        expect(mockLogError).toHaveBeenCalledWith(
          'Failed to create a history version for api::article.article',
          { documentId: 'doc-1', locale: 'en', error }
        );
      });
    });
  });
});
