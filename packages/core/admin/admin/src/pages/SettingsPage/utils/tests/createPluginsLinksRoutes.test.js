import createPluginsLinksRoutes, { retrieveRoutes } from '../createPluginsLinksRoutes';

describe('ADMIN | CONTAINERS | SettingsPage | utils', () => {
  describe('createPluginsLinksRoutes', () => {
    it('should return an empty array', () => {
      expect(createPluginsLinksRoutes([])).toEqual([]);
    });

    it('should return the correct data', () => {
      const data = [
        {
          id: 'global',
          links: [],
        },
        {
          id: 'permissions',
          links: [
            {
              Component: () => 'test',
              to: '/test',
              exact: true,
            },
            {
              Component: null,
              to: '/test1',
              exact: true,
            },
          ],
        },
      ];

      const results = createPluginsLinksRoutes(data);

      expect(results).toHaveLength(1);
      expect(results[0].key).toEqual('/test');
      expect(results[0].props.path).toEqual('/test');
      expect(results[0].props.component()).toEqual('test');
    });
  });

  describe('retrieveRoutes', () => {
    it('should return links that have a component', () => {
      const data = [
        {
          Component: () => 'test',
          to: '/test',
          exact: true,
        },
        {
          Component: null,
          to: '/test1',
          exact: true,
        },
        {
          Component: () => 'test2',
          to: '/test2',
          exact: true,
        },
      ];

      const results = retrieveRoutes(data);

      expect(results).toHaveLength(2);
      expect(results[0].to).toEqual('/test');
      expect(results[1].to).toEqual('/test2');
    });
  });
});
