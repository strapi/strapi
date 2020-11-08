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
        isRequired: false,
      },
      ctb: {
        name: 'ctb',
        pluginLogo: null,
        id: 'ctb',
        icon: 'plug',
        description: 'test',
        foo: 'bar',
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
        isRequired: true,
      },
      {
        name: 'ctm',
        logo: 'plug',
        id: 'ctm',
        icon: null,
        description: 'test test',
        onConfirm,
        isRequired: false,
      },
    ];

    expect(generateRows(data, onConfirm)).toEqual(expected);
  });
});
