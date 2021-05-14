import getAvailableActions from '../getAvailableActions';

describe('ADMIN | COMPONENTS | Permissions | ContentTypeCollapse | utils | getAvailableActions', () => {
  it('should return an empty array', () => {
    expect(getAvailableActions([])).toHaveLength(0);
  });

  it('should set the isDisplayed key to false to all actions if the subject value does not match the target', () => {
    const actions = [
      {
        label: 'Create',
        actionId: 'content-manager.explorer.create',
        subjects: ['restaurant', 'address'],
        applyToProperties: ['fields', 'locales'],
      },
      {
        label: 'Read',
        actionId: 'content-manager.explorer.read',
        subjects: ['restaurant', 'address'],
        applyToProperties: ['fields', 'locales'],
      },
    ];
    const expected = [
      {
        label: 'Create',
        actionId: 'content-manager.explorer.create',
        subjects: ['restaurant', 'address'],
        applyToProperties: ['fields', 'locales'],
        isDisplayed: false,
      },
      {
        label: 'Read',
        actionId: 'content-manager.explorer.read',
        subjects: ['restaurant', 'address'],
        applyToProperties: ['fields', 'locales'],
        isDisplayed: false,
      },
    ];

    expect(getAvailableActions(actions, 'test')).toEqual(expected);
  });

  it('should set the isDisplayed key to false for the actions which the type of the subjects value is not an array', () => {
    const actions = [
      {
        label: 'Create',
        actionId: 'content-manager.explorer.create',
        subjects: 'test',
        applyToProperties: ['fields', 'locales'],
      },
      {
        label: 'Read',
        actionId: 'content-manager.explorer.read',
        applyToProperties: ['fields', 'locales'],
      },
    ];
    const expected = [
      {
        label: 'Create',
        actionId: 'content-manager.explorer.create',
        subjects: 'test',
        applyToProperties: ['fields', 'locales'],
        isDisplayed: false,
      },
      {
        label: 'Read',
        actionId: 'content-manager.explorer.read',
        applyToProperties: ['fields', 'locales'],
        isDisplayed: false,
      },
    ];

    expect(getAvailableActions(actions, 'test')).toEqual(expected);
  });

  it('should set the isDisplayed key to false for the action which include the targetSubject in the subjects value array', () => {
    const actions = [
      {
        label: 'Create',
        actionId: 'content-manager.explorer.create',
        subjects: ['restaurant', 'address'],
        applyToProperties: ['fields', 'locales'],
      },
      {
        label: 'Read',
        actionId: 'content-manager.explorer.read',
        subjects: [],
        applyToProperties: ['fields', 'locales'],
      },
    ];
    const expected = [
      {
        label: 'Create',
        actionId: 'content-manager.explorer.create',
        subjects: ['restaurant', 'address'],
        applyToProperties: ['fields', 'locales'],
        isDisplayed: true,
      },
      {
        label: 'Read',
        actionId: 'content-manager.explorer.read',
        subjects: [],
        applyToProperties: ['fields', 'locales'],
        isDisplayed: false,
      },
    ];

    expect(getAvailableActions(actions, 'address')).toEqual(expected);
  });
});
