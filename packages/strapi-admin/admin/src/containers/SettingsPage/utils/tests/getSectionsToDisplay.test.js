import getSectionsToDisplay from '../getSectionsToDisplay';

describe('ADMIN | Container | SettingsPage | utils | getSectionToDisplay', () => {
  it('should filter the sections that have all links with the isDisplayed property to false', () => {
    const data = [
      {
        id: 'global',
        links: [
          {
            isDisplayed: false,
          },
          {
            isDisplayed: false,
          },
        ],
      },
      {
        id: 'permissions',
        links: [
          {
            isDisplayed: true,
          },
          {
            isDisplayed: false,
          },
        ],
      },
      {
        id: 'test',
        links: [],
      },
    ];

    const results = getSectionsToDisplay(data);

    expect(results).toHaveLength(1);
    expect(results[0].id).toEqual('permissions');
  });
});
