import retrievePluginsMenu from '../retrievePluginsMenu';

describe('ADMIN | containers | SettingsPage | utils', () => {
  describe('retrievePluginsMenu', () => {
    it('should return an empty array if there is no plugins', () => {
      expect(retrievePluginsMenu({})).toHaveLength(0);
    });

    it('should return an array of menu sections', () => {
      const plugins = {
        test: {
          settings: {
            menuSection: null,
          },
        },
        noSettings: {},
        foo: {
          settings: {
            menuSection: { label: 'test' },
          },
        },
        bar: {
          settings: {
            menuSection: { label: 'test2' },
          },
        },
      };
      const expected = [{ label: 'test' }, { label: 'test2' }];

      expect(retrievePluginsMenu(plugins)).toEqual(expected);
    });
  });
});
