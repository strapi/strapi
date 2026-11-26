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

    it('should return the routes of an API router declared as an array of routes', () => {
      // Arrange
      // An API router file may export an array of routes: the entry stays an array in every phase
      const strapiMock = {
        apis: {
          'api-a': { routes: { 'router-a': routesFixtures.test } },
          'api-b': { routes: { 'router-b': { routes: routesFixtures.foobar } } },
        },
      } as unknown as Core.Strapi;
      const provider = new ApiRoutesProvider(strapiMock);

      // Act
      const { routes } = provider;

      // Assert
      expect(routes).toStrictEqual([...routesFixtures.test, ...routesFixtures.foobar]);
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
