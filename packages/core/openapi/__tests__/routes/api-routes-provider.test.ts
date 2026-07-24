import type { Core } from '@strapi/types';

import { ApiRoutesProvider } from '../../src/routes';
import { routes as routesFixtures } from '../fixtures';
import { StrapiMock } from '../mocks';

describe('ApiRoutesProvider', () => {
  describe('routes', () => {
    it('should return all registered routes', () => {
      // Arrange
      const strapiMock = new StrapiMock() as unknown as Core.Strapi;
      const provider = new ApiRoutesProvider(strapiMock);

      // Act
      const { routes } = provider;

      // Assert
      expect(routes).toHaveLength(routesFixtures.test.length + routesFixtures.foobar.length);
    });
  });

  describe('Symbol.Iterator', () =>
    it('should be iterable', () => {
      // Arrange
      const strapiMock = new StrapiMock() as unknown as Core.Strapi;
      const provider = new ApiRoutesProvider(strapiMock);

      // Act
      const routes = [...provider];

      // Assert
      expect(routes).toHaveLength(routesFixtures.test.length + routesFixtures.foobar.length);
    }));

  describe('path prefixing', () => {
    it('should prepend api.rest.prefix to route paths', () => {
      const strapiMock = {
        config: {
          get: (key: string, defaultValue?: unknown) =>
            key === 'api.rest.prefix' ? '/api' : defaultValue,
        },
        apis: {
          article: {
            routes: {
              'content-api': {
                type: 'content-api',
                routes: [
                  { method: 'GET', path: '/articles', handler: 'article.find', info: {} },
                  {
                    method: 'GET',
                    path: '/articles/:id',
                    handler: 'article.findOne',
                    info: {},
                  },
                ],
              },
            },
          },
        },
      } as unknown as Core.Strapi;

      const provider = new ApiRoutesProvider(strapiMock);
      const { routes } = provider;

      expect(routes).toHaveLength(2);
      expect(routes[0].path).toBe('/api/articles');
      expect(routes[1].path).toBe('/api/articles/:id');
    });

    it('should honour a custom api.rest.prefix', () => {
      const strapiMock = {
        config: {
          get: (key: string, defaultValue?: unknown) =>
            key === 'api.rest.prefix' ? '/custom' : defaultValue,
        },
        apis: {
          article: {
            routes: {
              'content-api': {
                type: 'content-api',
                routes: [{ method: 'GET', path: '/articles', handler: 'article.find', info: {} }],
              },
            },
          },
        },
      } as unknown as Core.Strapi;

      const provider = new ApiRoutesProvider(strapiMock);
      const { routes } = provider;

      expect(routes[0].path).toBe('/custom/articles');
    });

    it('should apply the router-level prefix between api prefix and route path', () => {
      const strapiMock = {
        config: {
          get: (key: string, defaultValue?: unknown) =>
            key === 'api.rest.prefix' ? '/api' : defaultValue,
        },
        apis: {
          article: {
            routes: {
              'content-api': {
                type: 'content-api',
                prefix: '/blog',
                routes: [{ method: 'GET', path: '/articles', handler: 'article.find', info: {} }],
              },
            },
          },
        },
      } as unknown as Core.Strapi;

      const provider = new ApiRoutesProvider(strapiMock);
      const { routes } = provider;

      expect(routes[0].path).toBe('/api/blog/articles');
    });

    it('should let route config.prefix override the router prefix', () => {
      const strapiMock = {
        config: {
          get: (key: string, defaultValue?: unknown) =>
            key === 'api.rest.prefix' ? '/api' : defaultValue,
        },
        apis: {
          article: {
            routes: {
              'content-api': {
                type: 'content-api',
                prefix: '/blog',
                routes: [
                  {
                    method: 'GET',
                    path: '/ping',
                    handler: 'article.ping',
                    info: {},
                    config: { prefix: '' },
                  },
                ],
              },
            },
          },
        },
      } as unknown as Core.Strapi;

      const provider = new ApiRoutesProvider(strapiMock);
      const { routes } = provider;

      expect(routes[0].path).toBe('/api/ping');
    });
  });
});
