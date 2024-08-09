import { errors } from '@strapi/utils';
import { RequestHandler, rest } from 'msw';

import { COLLECTION_TYPES, SINGLE_TYPES } from '../src/constants/collections';
import { historyHandlers } from '../src/history/tests/server';

import { mockData } from './mockData';

export const handlers: RequestHandler[] = [
  /**
   *
   * CONTENT_MANAGER
   *
   */
  rest.put('/content-manager/content-types/:model/configuration', (req, res, ctx) => {
    return res(ctx.status(200));
  }),
  rest.get('/content-manager/content-types/:model/configuration', (req, res, ctx) => {
    const configuration =
      req.params.model === 'api::homepage.homepage'
        ? mockData.contentManager.singleTypeConfiguration
        : mockData.contentManager.collectionTypeConfiguration;

    return res(
      ctx.json({
        data: configuration,
      })
    );
  }),
  rest.get('/content-manager/:collectionType/:uid/:id', (req, res, ctx) => {
    const { id, collectionType, uid } = req.params;

    if (id === 'configuration') {
      return;
    }

    if (
      id === '12345' &&
      collectionType === COLLECTION_TYPES &&
      uid === mockData.contentManager.contentType
    ) {
      return res(
        ctx.json({
          data: {
            documentId: id,
            id: 1,
            name: 'Entry 1',
            createdAt: '',
            updatedAt: '',
            publishedAt: '',
          },
        })
      );
    } else {
      return res(
        ctx.status(404),
        ctx.json({ error: new errors.NotFoundError('Document not found') })
      );
    }
  }),
  rest.put('/content-manager/:collectionType/:uid/:id', async (req, res, ctx) => {
    const { id, collectionType, uid } = req.params;
    const data = await req.json();

    if (
      id === '12345' &&
      collectionType === COLLECTION_TYPES &&
      uid === mockData.contentManager.contentType
    ) {
      return res(
        ctx.json({
          data: {
            documentId: id,
            id: 1,
            name: 'Entry 1',
            ...data,
            createdAt: '',
            updatedAt: '',
            publishedAt: '',
          },
        })
      );
    }

    return res(
      ctx.status(404),
      ctx.json({
        error: new errors.NotFoundError('Document not found'),
      })
    );
  }),
  rest.post('/content-manager/:collectionType/:uid', async (req, res, ctx) => {
    const data = await req.json();

    if (
      req.params.collectionType !== SINGLE_TYPES &&
      req.params.collectionType !== COLLECTION_TYPES
    ) {
      return;
    }

    return res(
      ctx.json({
        data: {
          documentId: '12345',
          id: 1,
          ...data,
        },
      })
    );
  }),
  rest.post('/content-manager/:collectionType/:uid/clone/:id', async (req, res, ctx) => {
    const data = await req.json();

    return res(
      ctx.json({
        data: {
          documentId: '67890',
          id: 2,
          ...data,
        },
      })
    );
  }),
  rest.post('/content-manager/:collectionType/:uid/:id/actions/discard', (req, res, ctx) => {
    const { id } = req.params;

    if (id === '12345') {
      return res(
        ctx.status(200),
        ctx.json({
          documentId: id,
          id: 1,
          title: 'test',
        })
      );
    }

    return res(
      ctx.status(404),
      ctx.json({
        error: new errors.NotFoundError('Document not found'),
      })
    );
  }),
  rest.post('/content-manager/:collectionType/:uid/:id/actions/publish', async (req, res, ctx) => {
    const { id } = req.params;

    if (id === '12345') {
      return res(
        ctx.status(200),
        ctx.json({
          documentId: id,
          id: 1,
          title: 'test',
          publishedAt: '2024-01-23T16:23:38.948Z',
        })
      );
    }

    return res(
      ctx.status(404),
      ctx.json({
        error: new errors.NotFoundError('Document not found'),
      })
    );
  }),
  rest.post(
    '/content-manager/:collectionType/:uid/:id/actions/unpublish',
    async (req, res, ctx) => {
      const { id } = req.params;

      if (id === '12345') {
        return res(
          ctx.status(200),
          ctx.json({
            documentId: id,
            id: 1,
            title: 'test',
            publishedAt: null,
          })
        );
      }

      return res(
        ctx.status(404),
        ctx.json({
          error: new errors.NotFoundError('Document not found'),
        })
      );
    }
  ),
  rest.post(
    '/content-manager/collection-types/:uid/actions/bulkUnpublish',
    async (req, res, ctx) => {
      const { documentIds } = await req.json();

      if (documentIds.length === 2) {
        return res(
          ctx.status(200),
          ctx.json({
            count: 2,
          })
        );
      }

      return res(
        ctx.status(404),
        ctx.json({
          error: new errors.NotFoundError('Document not found'),
        })
      );
    }
  ),
  rest.delete('/content-manager/:collectionType/:uid/:id', (req, res, ctx) => {
    const { id } = req.params;

    if (id === '12345') {
      return res(
        ctx.status(200),
        ctx.json({
          documentId: id,
          id: 1,
          title: 'test',
        })
      );
    }

    return res(
      ctx.status(404),
      ctx.json({
        error: new errors.NotFoundError('Document not found'),
      })
    );
  }),
  rest.post('/content-manager/collection-types/:uid/actions/bulkDelete', async (req, res, ctx) => {
    const { documentIds } = await req.json();

    if (documentIds.length === 2) {
      return res(
        ctx.status(200),
        ctx.json({
          count: 2,
        })
      );
    }

    return res(
      ctx.status(404),
      ctx.json({
        error: new errors.NotFoundError('Document not found'),
      })
    );
  }),
  rest.get('/content-manager/init', (req, res, ctx) => {
    return res(
      ctx.json({
        data: {
          components: mockData.contentManager.components,
          contentTypes: mockData.contentManager.contentTypes,
        },
      })
    );
  }),
  rest.post('/content-manager/uid/generate', async (req, res, ctx) => {
    const body = await req.json();

    return res(
      ctx.json({
        data: body?.data?.target ?? 'regenerated',
      })
    );
  }),
  rest.post('/content-manager/uid/check-availability', async (req, res, ctx) => {
    const body = await req.json();

    return res(
      ctx.json({
        isAvailable: body?.value === 'not-taken',
      })
    );
  }),
  rest.get('/content-manager/collection-types/:contentType', (req, res, ctx) => {
    return res(
      ctx.json({
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
      })
    );
  }),
  rest.get('/content-manager/content-types', (req, res, ctx) =>
    res(
      ctx.json({
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
    )
  ),
  rest.get('/content-manager/components', (req, res, ctx) =>
    res(
      ctx.json({
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
    )
  ),
  rest.post(
    '/content-manager/collection-types/:contentType/actions/bulkPublish',
    (req, res, ctx) => {
      return res(
        ctx.json({
          data: {
            count: 3,
          },
        })
      );
    }
  ),
  rest.get(
    '/content-manager/collection-types/:contentType/actions/countManyEntriesDraftRelations',
    (req, res, ctx) => {
      return res(
        ctx.json({
          data: 0,
        })
      );
    }
  ),
  rest.get('/content-manager/relations/:model/:id/:fieldName', (req, res, ctx) => {
    return res(
      ctx.json({
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
      })
    );
  }),
  rest.get('/content-manager/relations/:model/:fieldName', (req, res, ctx) => {
    return res(
      ctx.json({
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
      })
    );
  }),
  /**
   * Content History
   */
  ...historyHandlers,
];
