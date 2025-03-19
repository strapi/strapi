import type { Core } from '@strapi/types';

import { PluginRoutesProvider } from '../../src/routes';
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
      expect(routes).toHaveLength(6);
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
      expect(routes).toHaveLength(6);
    });
  });
});
