import { RouteCollector } from '../../src/routes';
import { routes } from '../fixtures';
import { RouteMatcherMock, RoutesProviderMock } from '../mocks';

describe('RouteCollector', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('collect()', () => {
    it('should return empty array when no providers', () => {
      // Arrange
      const collector = new RouteCollector();

      // Act
      const result = collector.collect();

      // Assert
      expect(result).toEqual([]);
    });

    it('should collect routes from all providers', () => {
      // Arrange
      const mockProviderTest = new RoutesProviderMock(routes.test);
      const mockProviderFoobar = new RoutesProviderMock(routes.foobar);

      const collector = new RouteCollector([mockProviderTest, mockProviderFoobar]);

      jest.spyOn(mockProviderTest, Symbol.iterator);
      jest.spyOn(mockProviderFoobar, Symbol.iterator);

      // Act
      const collected = collector.collect();

      // Assert
      expect(mockProviderTest[Symbol.iterator]).toHaveBeenCalledTimes(1);
      expect(mockProviderFoobar[Symbol.iterator]).toHaveBeenCalledTimes(1);

      expect(collected).toHaveLength(routes.test.length + routes.foobar.length);
    });

    it(`should ignore routes not passing the matcher's rules`, () => {
      // Arrange
      const mockProviderTest = new RoutesProviderMock(routes.test);
      const mockProviderFoobar = new RoutesProviderMock(routes.foobar);

      const matcher = new RouteMatcherMock();

      const collector = new RouteCollector([mockProviderTest, mockProviderFoobar], matcher);

      jest.spyOn(mockProviderTest, Symbol.iterator);
      jest.spyOn(mockProviderFoobar, Symbol.iterator);

      jest.spyOn(matcher, 'match');

      // Act
      const collected = collector.collect();

      // Assert
      expect(mockProviderTest[Symbol.iterator]).toHaveBeenCalledTimes(1);
      expect(mockProviderFoobar[Symbol.iterator]).toHaveBeenCalledTimes(1);

      expect(matcher.match).toHaveBeenCalledTimes(routes.test.length + routes.foobar.length);

      expect(collected).not.toHaveLength(routes.test.length + routes.foobar.length);

      collected.forEach((route) => {
        expect(route.info.type).toBe('content-api');
      });
    });
  });
});
