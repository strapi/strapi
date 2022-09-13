import formatLinks from '../formatLinks';

describe('ADMIN | hooks | useSettingsMenu | utils | formatLinks', () => {
  it('should add the isDisplayed key to all sections links', () => {
    const menu = [
      {
        links: [{ name: 'link 1' }, { name: 'link 2' }],
      },
      {
        links: [{ name: 'link 3' }, { name: 'link 4' }],
      },
    ];
    const expected = [
      {
        links: [
          { name: 'link 1', isDisplayed: false },
          { name: 'link 2', isDisplayed: false },
        ],
      },
      {
        links: [
          { name: 'link 3', isDisplayed: false },
          { name: 'link 4', isDisplayed: false },
        ],
      },
    ];

    expect(formatLinks(menu)).toEqual(expected);
  });
});
