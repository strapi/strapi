import filterLinks from '../filterLinks';

describe('ADMIN | CONTAINERS | LeftMenu | utils | filterLinks', () => {
  it('should filter the links correctly', () => {
    const data = [
      {
        isDisplayed: false,
      },
      {
        isDisplayed: true,
      },
      { isDisplayed: true },
    ];

    expect(filterLinks(data)).toHaveLength(2);
  });
});
