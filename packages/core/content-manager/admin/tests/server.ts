import { errors } from '@strapi/utils';
import { HttpResponse, RequestHandler, http, type PathParams } from 'msw';

import { COLLECTION_TYPES, SINGLE_TYPES } from '../src/constants/collections';
import { historyHandlers } from '../src/history/tests/server';

import { mockData } from './mockData';

export const handlers: RequestHandler[] = [
  /**
   *
   * CONTENT_MANAGER
   *
   */
  http.put('/content-manager/content-types/:model/configuration', ({ params }) => {
    return HttpResponse.json(
      {
        data:
          params.model === 'api::homepage.homepage'
            ? mockData.contentManager.singleTypeConfiguration
            : mockData.contentManager.collectionTypeConfiguration,
      },
      { status: 200 }
    );
  }),
  http.get('/content-manager/content-types/:model/configuration', ({ params }) => {
    const configuration =
      params.model === 'api::homepage.homepage'
        ? mockData.contentManager.singleTypeConfiguration
        : mockData.contentManager.collectionTypeConfiguration;

    return HttpResponse.json({
      data: configuration,
    });
  }),
  http.get('/content-manager/:collectionType/:uid/:id', ({ params }) => {
    const { id, collectionType, uid } = params;

    if (id === 'configuration') {
      return;
    }

    if (
      id === '12345' &&
      collectionType === COLLECTION_TYPES &&
      uid === mockData.contentManager.contentType
    ) {
      return HttpResponse.json({
        data: {
          documentId: id,
          id: 1,
          name: 'Entry 1',
          createdAt: '',
          updatedAt: '',
          publishedAt: '',
        },
      });
    } else {
      return HttpResponse.json(
        { error: new errors.NotFoundError('Document not found') },
        { status: 404 }
      );
    }
  }),
  http.put<
    never,
    {
      documentId?: string;
      id?: number;
      name?: string;
      createdAt: string;
      updatedAt: string;
      publishedAt: string;
    }
  >('/content-manager/:collectionType/:uid/:id', async ({ request, params }) => {
    const { id, collectionType, uid } = params;
    const data = await request.json();

    if (
      id === '12345' &&
      collectionType === COLLECTION_TYPES &&
      uid === mockData.contentManager.contentType
    ) {
      return HttpResponse.json({
        data: {
          documentId: id,
          id: 1,
          name: 'Entry 1',
          ...data,
          createdAt: '',
          updatedAt: '',
          publishedAt: '',
        },
      });
    }

    return HttpResponse.json(
      {
        error: new errors.NotFoundError('Document not found'),
      },
      {
        status: 404,
      }
    );
  }),
  http.post<PathParams, { documentId?: string; id?: number }>(
    '/content-manager/:collectionType/:uid',
    async ({ request, params }) => {
      const data = await request.json();

      if (params.collectionType !== SINGLE_TYPES && params.collectionType !== COLLECTION_TYPES) {
        return;
      }

      return HttpResponse.json({
        data: {
          documentId: '12345',
          id: 1,
          ...data,
        },
      });
    }
  ),
  http.post<never, { documentId?: string; id?: number }>(
    '/content-manager/:collectionType/:uid/clone/:id',
    async ({ request }) => {
      const data = await request.json();

      return HttpResponse.json({
        data: {
          documentId: '67890',
          id: 2,
          ...data,
        },
      });
    }
  ),
  http.post('/content-manager/:collectionType/:uid/:id/actions/discard', ({ params }) => {
    const { id } = params;

    if (id === '12345') {
      return HttpResponse.json(
        {
          documentId: id,
          id: 1,
          title: 'test',
        },
        {
          status: 200,
        }
      );
    }

    return HttpResponse.json(
      {
        error: new errors.NotFoundError('Document not found'),
      },
      {
        status: 404,
      }
    );
  }),
  http.post('/content-manager/:collectionType/:uid/:id/actions/publish', async ({ params }) => {
    const { id } = params;

    if (id === '12345') {
      return HttpResponse.json(
        {
          documentId: id,
          id: 1,
          title: 'test',
          publishedAt: '2024-01-23T16:23:38.948Z',
        },
        {
          status: 200,
        }
      );
    }

    return HttpResponse.json(
      {
        error: new errors.NotFoundError('Document not found'),
      },
      {
        status: 404,
      }
    );
  }),
  http.post('/content-manager/:collectionType/:uid/:id/actions/unpublish', async ({ params }) => {
    const { id } = params;

    if (id === '12345') {
      return HttpResponse.json(
        {
          documentId: id,
          id: 1,
          title: 'test',
          publishedAt: null,
        },
        { status: 200 }
      );
    }

    return HttpResponse.json(
      {
        error: new errors.NotFoundError('Document not found'),
      },
      {
        status: 404,
      }
    );
  }),
  http.post<never, { documentIds: unknown[] }>(
    '/content-manager/collection-types/:uid/actions/bulkUnpublish',
    async ({ request }) => {
      const { documentIds } = await request.json();

      if (documentIds.length === 2) {
        return HttpResponse.json(
          {
            count: 2,
          },
          {
            status: 200,
          }
        );
      }

      return HttpResponse.json(
        {
          error: new errors.NotFoundError('Document not found'),
        },
        { status: 404 }
      );
    }
  ),
  http.delete('/content-manager/:collectionType/:uid/:id', ({ params }) => {
    const { id } = params;

    if (id === '12345') {
      return HttpResponse.json(
        {
          documentId: id,
          id: 1,
          title: 'test',
        },
        { status: 200 }
      );
    }

    return HttpResponse.json(
      {
        error: new errors.NotFoundError('Document not found'),
      },
      { status: 404 }
    );
  }),
  http.post<never, { documentIds: unknown[] }>(
    '/content-manager/collection-types/:uid/actions/bulkDelete',
    async ({ request }) => {
      const { documentIds } = await request.json();

      if (documentIds.length === 2) {
        return HttpResponse.json(
          {
            count: 2,
          },
          {
            status: 200,
          }
        );
      }

      return HttpResponse.json(
        {
          error: new errors.NotFoundError('Document not found'),
        },
        {
          status: 404,
        }
      );
    }
  ),
  http.get('/content-manager/init', () => {
    return HttpResponse.json({
      data: {
        components: mockData.contentManager.components,
        contentTypes: mockData.contentManager.contentTypes,
      },
    });
  }),
  http.post<never, { data?: { target: string } }>('/content-manager/uid/generate', async () => {
    return HttpResponse.json({
      data: 'regenerated',
    });
  }),
  http.post<never, { value?: string }>('/content-manager/uid/check-availability', async (args) => {
    const { request, params } = args;
    console.log('check-availability', params, request);

    let body;
    try {
      body = await request.json();
    } catch (error) {
      // TODO msw error TypeError: Body is unusable here
      console.log('Error parsing request body:', error);
    }

    return HttpResponse.json({
      data: {
        isAvailable: body?.value === 'not-taken',
      },
    });
  }),
  http.get('/content-manager/collection-types/:contentType', () => {
    return HttpResponse.json({
      results: [
        {
          documentId: '12345',
          id: 1,
          name: 'Entry 1',
          publishedAt: null,
          notrepeat_req: {},
        },
        {
          documentId: '67890',
          id: 2,
          name: 'Entry 2',
          publishedAt: null,
          notrepeat_req: {},
        },
        {
          documentId: 'abcde',
          id: 3,
          name: 'Entry 3',
          publishedAt: null,
          notrepeat_req: {},
        },
      ],
    });
  }),
  http.get('/content-manager/content-types', () =>
    HttpResponse.json({
      data: [
        {
          uid: 'admin::collectionType',
          isDisplayed: true,
          apiID: 'permission',
          kind: 'collectionType',
        },

        {
          uid: 'admin::collectionTypeNotDispalyed',
          isDisplayed: false,
          apiID: 'permission',
          kind: 'collectionType',
        },

        {
          uid: 'admin::singleType',
          isDisplayed: true,
          kind: 'singleType',
        },

        {
          uid: 'admin::singleTypeNotDispalyed',
          isDisplayed: false,
          kind: 'singleType',
        },
      ],
    })
  ),

  http.get('/content-manager/components', () =>
    HttpResponse.json({
      data: [
        {
          uid: 'basic.relation',
          isDisplayed: true,
          apiID: 'relation',
          category: 'basic',
          info: {
            displayName: 'Relation',
          },
          options: {},
          attributes: {
            id: {
              type: 'integer',
            },
            categories: {
              type: 'relation',
              relation: 'oneToMany',
              target: 'api::category.category',
              targetModel: 'api::category.category',
              relationType: 'oneToMany',
            },
          },
        },
      ],
    })
  ),
  http.post('/content-manager/collection-types/:contentType/actions/bulkPublish', () => {
    return HttpResponse.json({
      data: {
        count: 3,
      },
    });
  }),
  http.get(
    '/content-manager/collection-types/:contentType/actions/countManyEntriesDraftRelations',
    () => {
      return HttpResponse.json({
        data: 0,
      });
    }
  ),
  http.get('/content-manager/relations/:model/:id/:fieldName', () => {
    return HttpResponse.json({
      results: [
        {
          id: 1,
          documentId: 'apples',
          locale: 'en',
          status: 'draft',
          name: 'Relation entity 1',
        },
        {
          id: 2,
          documentId: 'bananas',
          locale: 'en',
          status: 'published',
          name: 'Relation entity 2',
        },
        {
          id: 3,
          documentId: 'pears',
          locale: 'en',
          status: 'modified',
          name: 'Relation entity 3',
        },
      ],
      pagination: {
        page: 1,
        pageCount: 1,
        total: 3,
      },
    });
  }),
  http.get('/content-manager/relations/:model/:fieldName', () => {
    return HttpResponse.json({
      results: [
        {
          id: 1,
          documentId: 'apples',
          locale: 'en',
          status: 'draft',
          name: 'Relation entity 1',
        },
        {
          id: 2,
          documentId: 'bananas',
          locale: 'en',
          status: 'published',
          name: 'Relation entity 2',
        },
        {
          id: 3,
          documentId: 'pears',
          locale: 'en',
          status: 'modified',
          name: 'Relation entity 3',
        },
      ],
      pagination: {
        page: 1,
        pageCount: 1,
        total: 3,
      },
    });
  }),
  /**
   * Content History
   */
  ...historyHandlers,
];
