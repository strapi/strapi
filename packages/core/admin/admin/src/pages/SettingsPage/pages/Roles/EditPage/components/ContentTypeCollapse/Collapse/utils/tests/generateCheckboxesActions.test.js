import generateCheckboxesActions from '../generateCheckboxesActions';

describe('ADMIN | COMPONENTS | Permissions | ContentTypes | ContentTypeCollapse', () => {
  it('should only add the hasSomeActionsSelected key to an action when its isDisplayed value is falsy', () => {
    const actions = [
      { actionId: 'test', isDisplayed: false },
      { actionId: 'test1', isDisplayed: false },
    ];
    const expected = [
      { actionId: 'test', isDisplayed: false, hasSomeActionsSelected: false },
      { actionId: 'test1', isDisplayed: false, hasSomeActionsSelected: false },
    ];

    expect(generateCheckboxesActions(actions)).toEqual(expected);
  });

  it('should return an array of actions with the isParentCheckbox key to false when the action does not apply to any property', () => {
    const actions = [
      {
        actionId: 'content-manager.explorer.delete',
        isDisplayed: true,
        label: 'Delete',
      },
    ];
    const modifiedData = {
      collectionTypes: {
        address: {
          test: {},
          'content-manager.explorer.delete': {
            properties: {
              enabled: true,
            },
            conditions: {
              'is-creator': true,
              'has-roles': false,
            },
          },
        },
      },
    };
    const pathToData = 'collectionTypes..address';
    const expected = [
      {
        actionId: 'content-manager.explorer.delete',
        isDisplayed: true,
        checkboxName:
          'collectionTypes..address..content-manager.explorer.delete..properties..enabled',
        hasAllActionsSelected: true,
        hasSomeActionsSelected: true,
        hasConditions: true,
        isParentCheckbox: false,
        label: 'Delete',
        pathToConditionsObject: ['collectionTypes', 'address', 'content-manager.explorer.delete'],
      },
    ];

    expect(generateCheckboxesActions(actions, modifiedData, pathToData)).toEqual(expected);
  });

  it('generate an array of actions which contain their state', () => {
    const actions = [
      {
        actionId: 'content-manager.explorer.create',
        isDisplayed: true,
        label: 'Create',
        applyToProperties: ['address'],
      },
      {
        actionId: 'content-manager.explorer.delete',
        isDisplayed: true,
        label: 'Delete',
      },
    ];
    const modifiedData = {
      collectionTypes: {
        address: {
          'content-manager.explorer.create': {
            properties: {
              fields: {
                f1: true,
                f2: false,
              },
            },
            conditions: {
              'is-creator': true,
              'has-roles': false,
            },
          },
          'content-manager.explorer.delete': {
            properties: {
              enabled: true,
            },
            conditions: {
              'is-creator': false,
              'has-roles': false,
            },
          },
        },
      },
    };
    const pathToData = 'collectionTypes..address';
    const expected = [
      {
        actionId: 'content-manager.explorer.create',
        isDisplayed: true,
        checkboxName: 'collectionTypes..address..content-manager.explorer.create',
        hasAllActionsSelected: false,
        hasSomeActionsSelected: true,
        hasConditions: true,
        isParentCheckbox: true,
        label: 'Create',
        pathToConditionsObject: ['collectionTypes', 'address', 'content-manager.explorer.create'],
      },
      {
        actionId: 'content-manager.explorer.delete',
        isDisplayed: true,
        checkboxName:
          'collectionTypes..address..content-manager.explorer.delete..properties..enabled',
        hasAllActionsSelected: true,
        hasSomeActionsSelected: true,
        hasConditions: false,
        isParentCheckbox: false,
        label: 'Delete',
        pathToConditionsObject: ['collectionTypes', 'address', 'content-manager.explorer.delete'],
      },
    ];

    expect(generateCheckboxesActions(actions, modifiedData, pathToData)).toEqual(expected);
  });
});
