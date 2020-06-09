import init, { sortLinks } from '../init';

describe('ADMIN | LeftMenu | init', () => {
  describe('init', () => {
    it('should return the initialState if the plugins are empty', () => {
      const initialState = {
        ok: true,
      };

      expect(init(initialState)).toEqual({ ok: true });
    });

    it('should create the pluginsSectionLinks correctly', () => {
      const plugins = {
        documentation: {
          menu: {
            pluginsSectionLinks: [
              {
                destination: '/plugins/documentation',
                icon: 'doc',
                label: {
                  id: 'documentation.plugin.name',
                  defaultMessage: 'Documentation',
                },
                name: 'documentation',
                permissions: [{ action: 'plugins::documentation.read', subject: null }],
              },
              {
                destination: '/plugins/documentation/test',
                icon: 'doc',
                label: {
                  id: 'documentation.plugin.name.test',
                  defaultMessage: 'Documentation Test',
                },
                name: 'documentation test',
                permissions: [],
              },
            ],
          },
        },
        test: {},
        'content-type-builder': {
          menu: {
            pluginsSectionLinks: [
              {
                destination: '/plugins/content-type-builder',
                icon: 'plug',
                label: {
                  id: 'content-type-builder.plugin.name',
                  defaultMessage: 'content-type-builder',
                },
                name: 'content-type-builder',
                permissions: [{ action: 'plugins::content-type-builder.read', subject: null }],
              },
            ],
          },
        },
      };
      const initialState = {
        generalSectionLinks: [],
        pluginsSectionLinks: [],
        isLoading: true,
      };
      const expected = {
        generalSectionLinks: [],
        pluginsSectionLinks: [
          {
            destination: '/plugins/content-type-builder',
            icon: 'plug',
            label: {
              id: 'content-type-builder.plugin.name',
              defaultMessage: 'content-type-builder',
            },
            isDisplayed: false,
            permissions: [{ action: 'plugins::content-type-builder.read', subject: null }],
          },
          {
            destination: '/plugins/documentation',
            icon: 'doc',
            label: {
              id: 'documentation.plugin.name',
              defaultMessage: 'Documentation',
            },
            isDisplayed: false,
            permissions: [{ action: 'plugins::documentation.read', subject: null }],
          },
          {
            destination: '/plugins/documentation/test',
            icon: 'doc',
            label: {
              id: 'documentation.plugin.name.test',
              defaultMessage: 'Documentation Test',
            },
            isDisplayed: false,
            permissions: [],
          },
        ],
        isLoading: true,
      };

      expect(init(initialState, plugins)).toEqual(expected);
    });
  });

  describe('sortLinks', () => {
    it('should return an empty array', () => {
      expect(sortLinks([])).toEqual([]);
    });

    it('should return a sorted array', () => {
      const data = [
        {
          name: 'un',
        },
        { name: 'deux' },
        { name: 'un-un' },
        { name: 'un-deux' },
        { name: 'un un' },
      ];
      const expected = [
        {
          name: 'deux',
        },
        {
          name: 'un',
        },
        { name: 'un un' },
        {
          name: 'un-deux',
        },
        {
          name: 'un-un',
        },
      ];

      expect(sortLinks(data)).toEqual(expected);
    });
  });
});
