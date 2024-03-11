import type { UID } from '@strapi/types';
import { scheduleJob } from 'node-schedule';
import { HISTORY_VERSION_UID } from '../../constants';
import { createHistoryService } from '../history';

const createMock = jest.fn();
const userId = 'user-id';
const fakeDate = new Date('1970-01-01T00:00:00.000Z');

jest.mock('node-schedule', () => ({
  scheduleJob: jest.fn(),
}));

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
  config: {
    get: () => undefined,
  },
  requestContext: {
    get: mockGetRequestContext,
  },
  documents: {
    use: jest.fn(),
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
    historyService.bootstrap();
    historyService.bootstrap();
    expect(mockStrapi.documents.use).toHaveBeenCalledTimes(1);
  });

  it('saves relevant document actions in history', async () => {
    const context = {
      action: 'create',
      contentType: {
        uid: 'api::article.article',
      },
      args: [
        {
          locale: 'fr',
        },
      ],
    };

    const next = jest.fn((context) => ({ ...context, documentId: 'document-id' }));
    await historyService.bootstrap();
    const historyMiddlewareFunction = mockStrapi.documents.use.mock.calls[0][0];

    // Check that we don't break the middleware chain
    await historyMiddlewareFunction(context, next);
    expect(next).toHaveBeenCalledWith(context);

    // Create and update actions should be saved in history
    expect(createMock).toHaveBeenCalled();
    context.action = 'update';
    await historyMiddlewareFunction(context, next);
    expect(createMock).toHaveBeenCalledTimes(2);

    // Publish and unpublish actions should be saved in history
    createMock.mockClear();
    context.action = 'publish';
    await historyMiddlewareFunction(context, next);
    context.action = 'unpublish';
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
    context.contentType.uid = 'plugin::upload.file';
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

  it('should create a cron job that runs once a day', async () => {
    // @ts-expect-error - this is a mock
    const mockScheduleJob = scheduleJob.mockImplementationOnce(
      jest.fn((rule, callback) => callback())
    );

    await historyService.bootstrap();

    expect(mockScheduleJob).toHaveBeenCalledTimes(1);
    expect(mockScheduleJob).toHaveBeenCalledWith('0 0 * * *', expect.any(Function));
  });
});
