import type { UID } from '@strapi/types';
import { HISTORY_VERSION_UID } from '../../constants';
import { createHistoryService } from '../history';

const createMock = jest.fn();
const userId = 'user-id';
const fakeDate = new Date('1970-01-01T00:00:00.000Z');

const mockGetRequestContext = jest.fn(() => {
  return {
    state: {
      user: {
        id: userId,
      },
    },
    request: {
      url: '/content-manager/test',
    },
  };
});
const mockFindOne = jest.fn();
const mockStrapi = {
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
          create: createMock,
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
    findOne: mockFindOne,
  })),
  config: {
    get: () => undefined,
  },
  requestContext: {
    get: mockGetRequestContext,
  },
  getModel(uid: UID.Schema) {
    if (uid === 'api::article.article') {
      return {
        attributes: {
          title: {
            type: 'string',
          },
          relation: {
            type: 'relation',
            target: 'api::category.category',
          },
          component: {
            type: 'component',
            component: 'some.component',
          },
          media: {
            type: 'media',
          },
        },
      };
    }

    if (uid === 'some.component') {
      return {
        attributes: {
          title: {
            type: 'string',
          },
          relation: {
            type: 'relation',
            target: 'api::restaurant.restaurant',
          },
          medias: {
            type: 'media',
            multiple: true,
          },
        },
      };
    }
  },
};

// @ts-expect-error - we're not mocking the full Strapi object
const historyService = createHistoryService({ strapi: mockStrapi });

describe('history-version service', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a history version with the author', async () => {
    jest.useFakeTimers().setSystemTime(fakeDate);

    const historyVersionData = {
      contentType: 'api::article.article' as UID.ContentType,
      data: {
        documentId: '1234',
        id: 1,
        title: 'My article',
      },
      locale: 'en',
      relatedDocumentId: 'randomid',
      schema: {
        title: {
          type: 'string' as const,
        },
      },
      componentsSchemas: {},
      status: 'draft' as const,
    };

    await historyService.createVersion(historyVersionData);
    expect(createMock).toHaveBeenCalledWith({
      data: {
        ...historyVersionData,
        createdBy: userId,
        createdAt: fakeDate,
      },
    });
  });

  it('creates a history version without any author', async () => {
    jest.useFakeTimers().setSystemTime(fakeDate);

    const historyVersionData = {
      contentType: 'api::article.article' as UID.ContentType,
      data: {
        documentId: '1234',
        id: 1,
        title: 'My article',
      },
      locale: 'en',
      relatedDocumentId: 'randomid',
      componentsSchemas: {},
      schema: {
        title: {
          type: 'string' as const,
        },
      },
      status: null,
    };

    mockGetRequestContext.mockReturnValueOnce(null as any);

    await historyService.createVersion(historyVersionData);
    expect(createMock).toHaveBeenCalledWith({
      data: {
        ...historyVersionData,
        createdBy: undefined,
        createdAt: fakeDate,
      },
    });
  });
});
