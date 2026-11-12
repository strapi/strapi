import type { UID } from '@strapi/types';
import { emitAudit, errors } from '@strapi/utils';
import { HISTORY_VERSION_UID } from '../../constants';
import { createHistoryService } from '../history';

jest.mock('@strapi/utils', () => ({
  ...jest.requireActual('@strapi/utils'),
  emitAudit: jest.fn(),
}));

const createMock = jest.fn();
const versionFindOneMock = jest.fn();
const documentUpdateMock = jest.fn();
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
  },
  localization: {
    getDefaultLocale: jest.fn().mockResolvedValue('en'),
    isLocalizedContentType: jest.fn().mockReturnValue(false),
    getLocales: jest.fn().mockResolvedValue([]),
  },
  // @ts-expect-error - Ignore
  plugin: (plugin: string) => mockStrapi.plugins[plugin],
  db: {
    query(uid: UID.ContentType) {
      if (uid === HISTORY_VERSION_UID) {
        return {
          create: createMock,
          findOne: versionFindOneMock,
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
    update: documentUpdateMock,
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
        modelType: 'component',
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

  it('creates a history version with its author, and still writes createdBy', async () => {
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
      status: 'draft' as const,
      source: 'admin-panel' as const,
      author: { type: 'person' as const, model: 'admin::user', id: '1' },
    };

    await historyService.createVersion(historyVersionData);
    const { author: _author, ...historyVersionColumns } = historyVersionData;
    expect(createMock).toHaveBeenCalledWith({
      data: {
        ...historyVersionColumns,
        authorType: 'person',
        authorModel: 'admin::user',
        authorId: '1',
        createdBy: userId,
        createdAt: fakeDate,
      },
    });
  });

  it('creates a Content API history version with no createdBy and no author', async () => {
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
      status: 'draft' as const,
      source: 'content-api' as const,
      author: null,
    };

    await historyService.createVersion(historyVersionData);
    const { author: _author, ...historyVersionColumns } = historyVersionData;
    expect(createMock).toHaveBeenCalledWith({
      data: {
        ...historyVersionColumns,
        authorType: null,
        authorModel: null,
        authorId: null,
        createdBy: null,
        createdAt: fakeDate,
      },
    });
  });

  it('creates a history version without createdBy outside a request', async () => {
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
      status: null,
      source: 'admin-panel' as const,
      author: { type: 'person' as const, model: 'admin::user', id: '1' },
    };

    mockGetRequestContext.mockReturnValueOnce(null as any);

    await historyService.createVersion(historyVersionData);
    const { author: _author, ...historyVersionColumns } = historyVersionData;
    expect(createMock).toHaveBeenCalledWith({
      data: {
        ...historyVersionColumns,
        authorType: 'person',
        authorModel: 'admin::user',
        authorId: '1',
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

  it('leaves out the versions deleted between the two queries', async () => {
    findPageMock.mockResolvedValueOnce({
      results: [{ id: 2 }, { id: 1 }],
      pagination: { page: 1, pageSize: 20, pageCount: 1, total: 2 },
    });
    findManyMock.mockResolvedValueOnce([
      { id: 2, data: { title: 'Second version' }, schema: {}, locale: null },
    ]);

    const { results } = await historyService.findVersionsPage({
      query: {
        contentType: 'api::article.article' as UID.ContentType,
        documentId: 'randomid',
      },
      state: { userAbility: {} },
    } as any);

    expect(results.map((result) => result.id)).toEqual([2]);
  });

  it('removes the component ids but keeps the document id when finding versions', async () => {
    findPageMock.mockResolvedValueOnce({
      results: [{ id: 1 }],
      pagination: { page: 1, pageSize: 20, pageCount: 1, total: 1 },
    });
    findManyMock.mockResolvedValueOnce([
      {
        id: 1,
        schema: {},
        locale: null,
        data: {
          id: 10,
          documentId: 'randomid',
          title: 'My article',
          component: { id: 20, title: 'My component' },
        },
      },
    ]);

    const { results } = await historyService.findVersionsPage({
      query: {
        contentType: 'api::article.article' as UID.ContentType,
        documentId: 'randomid',
      },
      state: { userAbility: {} },
    } as any);

    expect(results[0].data).toEqual({
      id: 10,
      documentId: 'randomid',
      title: 'My article',
      component: { title: 'My component' },
    });
  });

  it('removes the component ids before restoring a version', async () => {
    const attributes = mockStrapi.getModel('api::article.article')!.attributes;
    versionFindOneMock.mockResolvedValueOnce({
      id: 1,
      contentType: 'api::article.article',
      relatedDocumentId: 'randomid',
      locale: null,
      createdAt: new Date('2026-09-10T14:02:11.000Z'),
      schema: attributes,
      data: {
        id: 10,
        documentId: 'randomid',
        title: 'My article',
        relation: null,
        media: null,
        component: { id: 20, title: 'My component', relation: null, medias: null },
      },
    });
    documentUpdateMock.mockResolvedValueOnce({ documentId: 'randomid' });

    await historyService.restoreVersion(1);

    expect(documentUpdateMock).toHaveBeenCalledWith({
      documentId: 'randomid',
      locale: null,
      data: {
        documentId: 'randomid',
        title: 'My article',
        relation: null,
        media: null,
        component: { title: 'My component', relation: null, medias: null },
      },
    });
  });

  describe('restoreVersion', () => {
    const version = {
      id: 42,
      contentType: 'api::article.article',
      relatedDocumentId: 'abc123',
      locale: 'en',
      createdAt: new Date('2026-09-10T14:02:11.000Z'),
      schema: { title: { type: 'string' } },
      data: { title: 'Old title' },
    };

    beforeEach(() => {
      jest.mocked(emitAudit).mockClear();
      versionFindOneMock.mockResolvedValue(version);
    });

    it('restores the version and emits entry.history.restore', async () => {
      documentUpdateMock.mockResolvedValue({ documentId: 'abc123' });

      await historyService.restoreVersion(42);

      expect(documentUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: 'abc123', locale: 'en' })
      );
      expect(emitAudit).toHaveBeenCalledWith(expect.anything(), 'entry.history.restore', {
        uid: 'api::article.article',
        documentId: 'abc123',
        locale: 'en',
        versionId: 42,
        versionCreatedAt: '2026-09-10T14:02:11.000Z',
      });
    });

    it('records a null locale for a content type without i18n', async () => {
      versionFindOneMock.mockResolvedValue({ ...version, locale: null });
      documentUpdateMock.mockResolvedValue({ documentId: 'abc123' });

      await historyService.restoreVersion(42);

      expect(emitAudit).toHaveBeenCalledWith(
        expect.anything(),
        'entry.history.restore',
        expect.objectContaining({ locale: null })
      );
    });

    it('does not emit when the restore fails', async () => {
      documentUpdateMock.mockResolvedValue(null);

      await expect(historyService.restoreVersion(42)).rejects.toThrow('Failed to restore version');

      expect(emitAudit).not.toHaveBeenCalled();
    });

    it('throws a not found error when restoring an unknown version', async () => {
      versionFindOneMock.mockResolvedValueOnce(null);

      await expect(historyService.restoreVersion(999)).rejects.toThrow(
        new errors.NotFoundError('History version not found')
      );
    });
  });
});
