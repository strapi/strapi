import sortLinks from '../sortLinks';

describe('ADMIN | utils | sortLinks', () => {
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
