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

    it('should prepend the REST API prefix to content-api routes', () => {
      // Arrange
      const strapiMock = new StrapiMock() as unknown as Core.Strapi;
      const provider = new ApiRoutesProvider(strapiMock);

      // Act
      const { routes } = provider;

      // Assert
      const contentApiRoutes = routes.filter((r) => r.info.type === 'content-api');
      const adminRoutes = routes.filter((r) => r.info.type === 'admin');

      // Content-api routes should have the /api prefix
      contentApiRoutes.forEach((route) => {
        expect(route.path).toMatch(/^\/api\//);
      });

      // Admin routes should not have the /api prefix
      adminRoutes.forEach((route) => {
        expect(route.path).not.toMatch(/^\/api\//);
      });
    });

    it('should use the configured REST API prefix', () => {
      // Arrange
      const strapiMock = {
        apis: {
          articles: {
            routes: {
              'content-api': {
                routes: [
                  { info: { type: 'content-api' }, method: 'GET', path: '/articles', handler: '' },
                ],
              },
            },
          },
        },
        config: {
          get: (key: string, defaultValue?: string) => {
            if (key === 'api.rest.prefix') return '/custom-api';
            return defaultValue;
          },
        },
      } as unknown as Core.Strapi;
      const provider = new ApiRoutesProvider(strapiMock);

      // Act
      const { routes } = provider;

      // Assert
      expect(routes[0].path).toBe('/custom-api/articles');
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
