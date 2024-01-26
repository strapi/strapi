import type { UID } from '@strapi/types';
import { HISTORY_VERSION_UID } from '../../constants';
import { createHistoryVersionService } from '../history-version';

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
};

// @ts-expect-error - we're not mocking the full Strapi object
const historyVersionService = createHistoryVersionService({ strapi: mockStrapi });

describe('history-version service', () => {
  afterEach(() => {
    jest.useRealTimers();
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

    await historyVersionService.create(historyVersionData);
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

    await historyVersionService.create(historyVersionData);
    expect(createMock).toHaveBeenCalledWith({
      data: {
        ...historyVersionData,
        createdBy: undefined,
        createdAt: fakeDate,
      },
    });
  });
});
