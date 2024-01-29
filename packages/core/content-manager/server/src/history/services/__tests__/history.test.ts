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
  };
});

const mockStrapi = {
  db: {
    query(uid: UID.ContentType) {
      if (uid === HISTORY_VERSION_UID) {
        return {
          create: createMock,
        };
      }
    },
  },
  requestContext: {
    get: mockGetRequestContext,
  },
  documents: {
    middlewares: {
      add: jest.fn(),
    },
  },
  contentType(uid: UID.ContentType) {
    if (uid === 'api::article.article') {
      return {
        attributes: {
          title: {
            type: 'string',
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

  it('inits service only once', () => {
    historyService.init();
    historyService.init();
    expect(mockStrapi.documents.middlewares.add).toHaveBeenCalledTimes(1);
  });

  it('saves relevant document actions in history', async () => {
    const context = {
      action: 'create',
      uid: 'api::article.article',
      options: {
        id: 'document-id',
      },
      params: {
        locale: 'fr',
      },
    };

    const next = jest.fn();
    await historyService.init();
    const historyMiddlewareFunction = mockStrapi.documents.middlewares.add.mock.calls[0][2];

    // Check that we don't break the middleware chain
    await historyMiddlewareFunction(context, next);
    expect(next).toHaveBeenCalledWith(context);

    // Create and update actions should be saved in history
    expect(createMock).toHaveBeenCalled();
    context.action = 'update';
    await historyMiddlewareFunction(context, next);
    expect(createMock).toHaveBeenCalledTimes(2);

    // Other actions should be ignored
    createMock.mockClear();
    context.action = 'findOne';
    await historyMiddlewareFunction(context, next);
    context.action = 'delete';
    await historyMiddlewareFunction(context, next);
    expect(createMock).toHaveBeenCalledTimes(0);

    // Non-api content types should be ignored
    createMock.mockClear();
    context.uid = 'plugin::upload.file';
    context.action = 'create';
    await historyMiddlewareFunction(context, next);
    expect(createMock).toHaveBeenCalledTimes(0);

    // Don't break middleware chain even if we don't save the action in history
    next.mockClear();
    await historyMiddlewareFunction(context, next);
    expect(next).toHaveBeenCalledWith(context);
  });

  it('creates a history version with the author', async () => {
    jest.useFakeTimers().setSystemTime(fakeDate);

    const historyVersionData = {
      contentType: 'api::article.article' as UID.ContentType,
      data: {
        title: 'My article',
      },
      locale: 'en',
      relatedDocumentId: 'randomid',
      schema: {
        title: {
          type: 'string',
        },
      },
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
        title: 'My article',
      },
      locale: 'en',
      relatedDocumentId: 'randomid',
      schema: {
        title: {
          type: 'string',
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
