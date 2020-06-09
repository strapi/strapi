import getPluginsSettingsPermissions from '../getPluginsSettingsPermissions';

describe('ADMIN | LeftMenu | utils | getPluginsSettingsPermissions', () => {
  it('should return an empty array', () => {
    expect(getPluginsSettingsPermissions({})).toEqual([]);
  });

  it('should return an array containing all the permissions of the plugins settings links', () => {
    const menuSection = {
      // Unique id of the section
      id: 'test',
      // Title of Menu section using i18n
      title: {
        id: 'test.foo',
        defaultMessage: 'Super cool setting',
      },
      // Array of links to be displayed
      links: [
        {
          // Using string
          title: 'Setting page 1',
          to: 'settings/test/setting1',
          name: 'setting1',
          permissions: [{ action: 'plugins::test.action-name', subject: null }],
        },
        {
          // Using i18n with a corresponding translation key
          title: {
            id: 'test.bar',
            defaultMessage: 'Setting page 2',
          },
          to: 'settings/test/setting2',
          name: 'setting2',
          permissions: [{ action: 'plugins::my-plugin.action-name2', subject: null }],
        },
      ],
    };
    const plugins = {
      test: {
        settings: {
          global: {
            links: [
              {
                title: {
                  id: 'test.plugin.name',
                  defaultMessage: 'Test',
                },
                name: 'test',
                to: '/settings/test',
                Component: () => null,
                permissions: [{ action: 'plugins::test.settings.read', subject: null }],
              },
              {
                title: {
                  id: 'test.plugin.name1',
                  defaultMessage: 'Test1',
                },
                name: 'test1',
                to: '/settings/test1',
                Component: () => null,
                permissions: [{ action: 'plugins::test1.settings.read', subject: null }],
              },
            ],
          },
          menuSection,
        },
      },
      other: {},
      upload: {
        settings: {
          global: {
            links: [
              {
                title: {
                  id: 'upload.plugin.name',
                  defaultMessage: 'Media Library',
                },
                name: 'media-library',
                to: 'settings/media-library',
                Component: () => null,
                permissions: [
                  { action: 'plugins::upload.settings.read', subject: null },
                  { action: 'plugins::upload.settings.read.test', subject: null },
                ],
              },
            ],
          },
        },
      },
    };
    const expected = [
      { action: 'plugins::test.action-name', subject: null },
      { action: 'plugins::my-plugin.action-name2', subject: null },
      { action: 'plugins::upload.settings.read', subject: null },
      { action: 'plugins::upload.settings.read.test', subject: null },
    ];

    expect(getPluginsSettingsPermissions(plugins)).toEqual(expected);
  });
});
