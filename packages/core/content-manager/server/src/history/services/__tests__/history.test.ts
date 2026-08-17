import type { UID } from '@strapi/types';
import { HISTORY_VERSION_UID } from '../../constants';
import { createHistoryService } from '../history';

const createMock = jest.fn();
const findPageMock = jest.fn();
const findManyMock = jest.fn();
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
        isLocalizedContentType: jest.fn().mockReturnValue(false),
        find: jest.fn().mockResolvedValue([]),
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
          findPage: findPageMock,
          findMany: findManyMock,
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

  it('sorts the version ids only, then fetches the versions by id', async () => {
    findPageMock.mockResolvedValueOnce({
      results: [{ id: 2 }, { id: 1 }],
      pagination: { page: 1, pageSize: 20, pageCount: 1, total: 2 },
    });
    findManyMock.mockResolvedValueOnce([
      { id: 1, data: { title: 'First version' }, schema: {}, locale: null },
      { id: 2, data: { title: 'Second version' }, schema: {}, locale: null },
    ]);

    const { results } = await historyService.findVersionsPage({
      query: {
        contentType: 'api::article.article' as UID.ContentType,
        documentId: 'randomid',
      },
      state: { userAbility: {} },
    } as any);

    expect(findPageMock).toHaveBeenCalledWith(expect.objectContaining({ select: ['id'] }));
    expect(findManyMock).toHaveBeenCalledWith({
      where: { id: { $in: [2, 1] } },
      populate: ['createdBy'],
    });
    expect(results.map((result) => result.id)).toEqual([2, 1]);
  });
});
