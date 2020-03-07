import generateRows from '../generateRows';

describe('ADMIN | container | InstalledPlugins | utils | generateRows', () => {
  it('should return an empty array', () => {
    expect(generateRows({})).toEqual([]);
  });

  it('should return an array containing the plugins infos', () => {
    const data = {
      ctm: {
        name: 'ctm',
        pluginLogo: 'plug',
        id: 'ctm',
        icon: null,
        description: 'test test',
        foo: 'bar',
        withSetting: false,
        isRequired: false,
      },
      ctb: {
        name: 'ctb',
        pluginLogo: null,
        id: 'ctb',
        icon: 'plug',
        description: 'test',
        foo: 'bar',
        withSetting: true,
        isRequired: true,
      },
    };
    const onConfirm = jest.fn();

    const expected = [
      {
        name: 'ctb',
        logo: null,
        id: 'ctb',
        icon: 'plug',
        description: 'test',
        onConfirm,
        withSetting: true,
        isRequired: true,
      },
      {
        name: 'ctm',
        logo: 'plug',
        id: 'ctm',
        icon: null,
        description: 'test test',
        onConfirm,
        withSetting: false,
        isRequired: false,
      },
    ];

    expect(generateRows(data, onConfirm)).toEqual(expected);
  });
});
