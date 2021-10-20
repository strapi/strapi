import toPluginLinks from '../toPluginLinks';

describe('toPluginLinks', () => {
  it('transforms a plugin object into an array of plugin page links', async () => {
    const plugins = [
      {
        id: 'content-type-builder',
        description: 'content-type-builder.plugin.description',
        name: 'Content Type Builder',
        menu: {
          pluginsSectionLinks: [
            {
              destination: '/plugins/content-type-builder',
              icon: 'paint-brush',
              label: {
                id: 'content-type-builder.plugin.name',
                defaultMessage: 'Content-Types Builder',
              },
              name: 'Content Type Builder',
              permissions: [
                {
                  action: 'plugins::content-type-builder.read',
                  subject: null,
                },
              ],
            },
          ],
        },
      },
      {
        id: 'content-manager',
        description: 'content-manager.plugin.description',
        name: 'Content Manager',
      },
    ];

    const expected = [
      {
        destination: '/plugins/content-type-builder',
        icon: 'paint-brush',
        label: {
          id: 'content-type-builder.plugin.name',
          defaultMessage: 'Content-Types Builder',
        },
        permissions: [
          {
            action: 'plugins::content-type-builder.read',
            subject: null,
          },
        ],
      },
    ];
    const actual = toPluginLinks(plugins);

    expect(actual).toEqual(expected);
  });
});
