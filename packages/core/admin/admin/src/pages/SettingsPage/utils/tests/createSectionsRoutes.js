import createSectionsRoutes from '../createSectionsRoutes';

describe('ADMIN | CONTAINERS | SettingsPage | utils', () => {
  describe('createSectionsRoutes', () => {
    it('should return an empty array', () => {
      expect(createSectionsRoutes([])).toEqual([]);
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

      const results = createSectionsRoutes(data);

      expect(results).toHaveLength(1);
      expect(results[0].key).toEqual('/test');
      expect(results[0].props.path).toEqual('/test');
      expect(results[0].props.component()).toEqual('test');
    });
  });
});
