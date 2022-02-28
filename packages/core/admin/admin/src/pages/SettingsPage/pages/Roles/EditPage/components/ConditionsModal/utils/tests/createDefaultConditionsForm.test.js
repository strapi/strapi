import createDefaultConditionsForm, {
  createConditionsForm,
  createCategoryForm,
} from '../createDefaultConditionsForm';

describe('ADMIN | COMPONENTS | Roles | ConditionsModale | utils ', () => {
  describe('createConditionsForms', () => {
    it('should return an object with keys corresponding to the condition id and the leafs corresponding to the value retrieved from the argument', () => {
      const conditions = [{ id: 'admin::is-creator' }, { id: 'admin::has-role' }];
      const valueObject = {
        'admin::is-creator': true,
      };
      const expected = { 'admin::is-creator': true, 'admin::has-role': false };

      expect(createConditionsForm(conditions, valueObject)).toEqual(expected);
    });
  });

  describe('createCategoryForm', () => {
    it('should return an object with keys corresponding to the category name and values to the conditionForm', () => {
      const options = [
        ['default', [{ id: 'admin::is-creator' }]],
        ['general', [{ id: 'admin::has-role' }, { id: 'test' }]],
      ];
      const valueObject = {
        'admin::is-creator': 'ok',
        'admin::has-role': 'nok',
        test: 'test',
      };

      const expected = {
        default: {
          'admin::is-creator': 'ok',
        },
        general: {
          'admin::has-role': 'nok',
          test: 'test',
        },
      };
      expect(createCategoryForm(options, valueObject)).toEqual(expected);
    });
  });

  describe('createDefaultConditionsForm', () => {
    it('should return an object with keys corresponding to the path of the condition to set values corresponding to the one in the modifiedData object', () => {
      const modifiedData = {
        collectionTypes: {
          address: {
            'content-manager.explorer.create': {
              properties: {
                fields: { f1: true },
              },
              conditions: {
                'is-creator': false,
                'has-role': true,
              },
            },
            'content-manager.explorer.read': {
              properties: {
                fields: { f1: true },
              },
              conditions: {
                'is-creator': true,
                'has-role': true,
              },
            },
          },
          restaurant: {
            'content-manager.explorer.create': {
              properties: {
                fields: { f1: false },
              },
              conditions: { 'is-creator': 'test', 'has-role': 'nok' },
            },
          },
        },
        plugins: {},
      };
      const actionsToDisplay = [
        {
          id: 'content-manager.explorer.create',
          pathToConditionsObject: ['collectionTypes', 'address', 'content-manager.explorer.create'],
        },
      ];
      const arrayOfOptionsGroupedByCategory = [
        ['default', [{ id: 'is-creator' }]],
        ['general', [{ id: 'has-role' }]],
      ];

      const expected = {
        'collectionTypes..address..content-manager.explorer.create': {
          default: {
            'is-creator': false,
          },
          general: {
            'has-role': true,
          },
        },
      };

      expect(
        createDefaultConditionsForm(actionsToDisplay, modifiedData, arrayOfOptionsGroupedByCategory)
      ).toEqual(expected);
    });
  });
});
