import type { Core, Schema } from '@strapi/types';

import { createRoutes } from '..';

const createContentType = (kind: 'collectionType' | 'singleType') =>
  ({
    uid: 'api::article.article',
    modelType: 'contentType',
    kind,
    info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
    options: { draftAndPublish: false },
    attributes: {
      title: { type: 'string' },
    },
  }) as unknown as Schema.ContentType;

describe('Core API routes', () => {
  const createStrapi = (contentType: Schema.ContentType) =>
    ({
      getModel: jest.fn(() => contentType),
      localization: { isLocalizedContentType: jest.fn(() => false) },
    }) as unknown as Core.Strapi;

  const setup = (kind: 'collectionType' | 'singleType') => {
    const contentType = createContentType(kind);
    const strapi = createStrapi(contentType);
    // createRoutes reads the global instance to resolve conditional query params
    global.strapi = strapi;

    return createRoutes({ strapi, contentType });
  };

  describe('collection type', () => {
    const routes = setup('collectionType');

    it.each(['find', 'findOne', 'update'])(
      '%s declares no response status and a response schema',
      (action) => {
        const route = routes[action as keyof typeof routes];

        expect(route.responseStatus).toBeUndefined();
        expect(route.response).toBeDefined();
      }
    );

    it('create declares a 201 response status with a response schema', () => {
      expect(routes.create.responseStatus).toBe(201);
      expect(routes.create.response).toBeDefined();
    });

    it('delete declares a 204 response status without a response schema', () => {
      expect(routes.delete.responseStatus).toBe(204);
      expect(routes.delete.response).toBeUndefined();
    });
  });

  describe('single type', () => {
    const routes = setup('singleType');

    it.each(['find', 'update'])(
      '%s declares no response status and a response schema',
      (action) => {
        const route = routes[action as keyof typeof routes];

        expect(route.responseStatus).toBeUndefined();
        expect(route.response).toBeDefined();
      }
    );

    it('delete declares a 204 response status without a response schema', () => {
      expect(routes.delete.responseStatus).toBe(204);
      expect(routes.delete.response).toBeUndefined();
    });
  });
});
