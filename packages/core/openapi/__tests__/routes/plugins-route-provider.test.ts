import type { Core } from '@strapi/types';

import { PluginRoutesProvider } from '../../src/routes';
import { routes as routesFixtures } from '../fixtures';
import { StrapiMock } from '../mocks';

describe('PluginRoutesProvider', () => {
  describe('routes', () => {
    it('should return only content-api routes', () => {
      // Arrange
      const strapiMock = new StrapiMock() as unknown as Core.Strapi;
      const provider = new PluginRoutesProvider(strapiMock);

      // Act
      const { routes } = provider;

      // Assert
      expect(routes).toHaveLength(routesFixtures.test.length + routesFixtures.foobar.length);
    });

    it('should prepend router prefix to route paths', () => {
      const strapiMock = {
        plugins: {
          upload: {
            routes: {
              'content-api': {
                type: 'content-api',
                prefix: '/upload',
                routes: [
                  {
                    method: 'GET',
                    path: '/',
                    handler: 'controller.find',
                    info: { type: 'content-api' },
                  },
                  {
                    method: 'GET',
                    path: '/files/:id',
                    handler: 'controller.findOne',
                    info: { type: 'content-api' },
                  },
                ],
              },
            },
          },
        },
      } as unknown as Core.Strapi;

      const provider = new PluginRoutesProvider(strapiMock);
      const { routes } = provider;

      expect(routes).toHaveLength(2);
      expect(routes[0].path).toBe('/upload');
      expect(routes[1].path).toBe('/upload/files/:id');
    });

    it('should use route config.prefix instead of router prefix when present', () => {
      const strapiMock = {
        plugins: {
          'users-permissions': {
            routes: {
              'content-api': {
                type: 'content-api',
                prefix: '/users-permissions',
                routes: [
                  {
                    method: 'POST',
                    path: '/auth/local',
                    handler: 'auth.callback',
                    info: { type: 'content-api' },
                    config: { prefix: '' },
                  },
                  {
                    method: 'GET',
                    path: '/users/me',
                    handler: 'user.me',
                    info: { type: 'content-api' },
                    config: { prefix: '' },
                  },
                ],
              },
            },
          },
        },
      } as unknown as Core.Strapi;

      const provider = new PluginRoutesProvider(strapiMock);
      const { routes } = provider;

      expect(routes).toHaveLength(2);
      // These routes have config.prefix = '', so they bypass the router prefix
      expect(routes[0].path).toBe('/auth/local');
      expect(routes[1].path).toBe('/users/me');
    });

    it('should handle mix of routes with and without config.prefix', () => {
      const strapiMock = {
        plugins: {
          'users-permissions': {
            routes: {
              'content-api': {
                type: 'content-api',
                prefix: '/users-permissions',
                routes: [
                  {
                    method: 'POST',
                    path: '/auth/local',
                    handler: 'auth.callback',
                    info: { type: 'content-api' },
                    config: { prefix: '' },
                  },
                  {
                    method: 'GET',
                    path: '/roles',
                    handler: 'role.find',
                    info: { type: 'content-api' },
                  },
                ],
              },
            },
          },
        },
      } as unknown as Core.Strapi;

      const provider = new PluginRoutesProvider(strapiMock);
      const { routes } = provider;

      expect(routes).toHaveLength(2);
      // config.prefix = '' bypasses router prefix
      expect(routes[0].path).toBe('/auth/local');
      // No config.prefix, uses router prefix
      expect(routes[1].path).toBe('/users-permissions/roles');
    });

    it('should handle routes with no router prefix', () => {
      const strapiMock = {
        plugins: {
          test: {
            routes: {
              'content-api': {
                type: 'content-api',
                routes: [
                  {
                    method: 'GET',
                    path: '/items',
                    handler: 'controller.find',
                    info: { type: 'content-api' },
                  },
                ],
              },
            },
          },
        },
      } as unknown as Core.Strapi;

      const provider = new PluginRoutesProvider(strapiMock);
      const { routes } = provider;

      expect(routes).toHaveLength(1);
      expect(routes[0].path).toBe('/items');
    });
  });

  describe('Symbol.Iterator', () => {
    it('should be iterable', () => {
      // Arrange
      const strapiMock = new StrapiMock() as unknown as Core.Strapi;
      const provider = new PluginRoutesProvider(strapiMock);

      // Act
      const routes = [...provider];

      // Assert
      expect(routes).toHaveLength(routesFixtures.test.length + routesFixtures.foobar.length);
    });
  });
});
