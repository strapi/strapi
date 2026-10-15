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

    it('should prepend the content API prefix to API route paths', () => {
      const strapiMock = {
        config: {
          get: jest.fn((key: string, defaultValue?: unknown) => {
            if (key === 'api.rest.prefix') {
              return '/api';
            }

            return defaultValue;
          }),
        },
        apis: {
          article: {
            routes: {
              article: {
                routes: [
                  {
                    info: { type: 'content-api' },
                    method: 'GET',
                    path: '/articles',
                    handler: 'api::article.article.find',
                  },
                  {
                    info: { type: 'content-api' },
                    method: 'GET',
                    path: '/api/prefixed',
                    handler: 'api::article.article.findPrefixed',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Core.Strapi;

      const provider = new ApiRoutesProvider(strapiMock);
      const { routes } = provider;

      expect(routes[0].path).toBe('/api/articles');
      expect(routes[1].path).toBe('/api/prefixed');
    });

    it('should support custom content API prefixes', () => {
      const strapiMock = {
        config: {
          get: jest.fn((key: string, defaultValue?: unknown) => {
            if (key === 'api.rest.prefix') {
              return '/rest';
            }

            return defaultValue;
          }),
        },
        apis: {
          article: {
            routes: {
              article: {
                routes: [
                  {
                    info: { type: 'content-api' },
                    method: 'GET',
                    path: '/articles',
                    handler: 'api::article.article.find',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Core.Strapi;

      const provider = new ApiRoutesProvider(strapiMock);
      const { routes } = provider;

      expect(routes[0].path).toBe('/rest/articles');
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
