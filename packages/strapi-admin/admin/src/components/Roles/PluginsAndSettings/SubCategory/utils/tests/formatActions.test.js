import formatActions from '../formatActions';

describe('ADMIN | COMPONENTS | Permissions | PluginsAndSettings | SubCategories | utils | formatActions', () => {
  it('should return an array and mutates each action to add their state', () => {
    const actions = [
      {
        displayName: 'test',
        action: 'test',
      },
    ];

    const modifiedData = {
      plugins: {
        doc: {
          general: { test: { properties: { enabled: false }, conditions: { creator: false } } },
          settings: { test: { properties: { enabled: true }, conditions: { creator: true } } },
        },
        ctb: {},
      },
    };
    const pathToData = ['plugins', 'doc', 'general'];

    expect(formatActions(actions, modifiedData, pathToData)).toEqual([
      {
        displayName: 'test',
        action: 'test',
        isDisplayed: false,
        checkboxName: 'plugins..doc..general..test..properties..enabled',
        hasSomeActionsSelected: false,
        hasConditions: false,
        label: 'test',
        actionId: 'test',
        pathToConditionsObject: ['plugins', 'doc', 'general', 'test'],
        value: false,
      },
    ]);

    expect(formatActions(actions, modifiedData, ['plugins', 'doc', 'settings'])).toEqual([
      {
        displayName: 'test',
        action: 'test',
        isDisplayed: true,
        checkboxName: 'plugins..doc..settings..test..properties..enabled',
        hasSomeActionsSelected: true,
        hasConditions: true,
        value: true,
        label: 'test',
        actionId: 'test',
        pathToConditionsObject: ['plugins', 'doc', 'settings', 'test'],
      },
    ]);
  });
});
