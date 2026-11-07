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

    it('should prepend the configured api.rest.prefix to route paths', () => {
      // Arrange
      const strapiMock = {
        config: {
          get: (path: string, defaultValue: unknown) =>
            path === 'api.rest.prefix' ? '/api' : defaultValue,
        },
        apis: {
          article: {
            routes: {
              'content-api': {
                type: 'content-api',
                routes: [
                  {
                    method: 'GET',
                    path: '/articles',
                    handler: 'article.find',
                    info: { type: 'content-api' },
                  },
                  {
                    method: 'GET',
                    path: '/articles/:id',
                    handler: 'article.findOne',
                    info: { type: 'content-api' },
                  },
                ],
              },
            },
          },
        },
      } as unknown as Core.Strapi;
      const provider = new ApiRoutesProvider(strapiMock);

      // Act
      const { routes } = provider;

      // Assert
      expect(routes).toHaveLength(2);
      expect(routes[0].path).toBe('/api/articles');
      expect(routes[1].path).toBe('/api/articles/:id');
    });

    it('should use the configured api.rest.prefix value', () => {
      // Arrange
      const strapiMock = {
        config: {
          get: (path: string, defaultValue: unknown) =>
            path === 'api.rest.prefix' ? '/v2' : defaultValue,
        },
        apis: {
          article: {
            routes: {
              'content-api': {
                type: 'content-api',
                routes: [
                  {
                    method: 'GET',
                    path: '/articles',
                    handler: 'article.find',
                    info: { type: 'content-api' },
                  },
                ],
              },
            },
          },
        },
      } as unknown as Core.Strapi;
      const provider = new ApiRoutesProvider(strapiMock);

      // Act
      const { routes } = provider;

      // Assert
      expect(routes).toHaveLength(1);
      expect(routes[0].path).toBe('/v2/articles');
    });

    it('should use route config.prefix instead of the api prefix when present', () => {
      // Arrange
      const strapiMock = {
        config: {
          get: (path: string, defaultValue: unknown) =>
            path === 'api.rest.prefix' ? '/api' : defaultValue,
        },
        apis: {
          article: {
            routes: {
              'content-api': {
                type: 'content-api',
                routes: [
                  {
                    method: 'POST',
                    path: '/auth/local',
                    handler: 'article.custom',
                    info: { type: 'content-api' },
                    config: { prefix: '' },
                  },
                ],
              },
            },
          },
        },
      } as unknown as Core.Strapi;
      const provider = new ApiRoutesProvider(strapiMock);

      // Act
      const { routes } = provider;

      // Assert
      expect(routes).toHaveLength(1);
      expect(routes[0].path).toBe('/auth/local');
    });

    it('should prefer router.prefix over the api.rest.prefix config when set', () => {
      // Arrange
      const strapiMock = {
        config: {
          get: (path: string, defaultValue: unknown) =>
            path === 'api.rest.prefix' ? '/api' : defaultValue,
        },
        apis: {
          article: {
            routes: {
              'content-api': {
                type: 'content-api',
                prefix: '/custom',
                routes: [
                  {
                    method: 'GET',
                    path: '/articles',
                    handler: 'article.find',
                    info: { type: 'content-api' },
                  },
                ],
              },
            },
          },
        },
      } as unknown as Core.Strapi;
      const provider = new ApiRoutesProvider(strapiMock);

      // Act
      const { routes } = provider;

      // Assert
      expect(routes).toHaveLength(1);
      expect(routes[0].path).toBe('/custom/articles');
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
});
