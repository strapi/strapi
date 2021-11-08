import getCheckboxesState, {
  getActionsIds,
  getRelatedActionIdData,
} from '../getRowLabelCheckboxesState';

describe('ADMIN | COMPONENTS | PERMISSIONS | GlobalActions | utils', () => {
  describe('getActionsIds', () => {
    it('should return an array', () => {
      expect(getActionsIds([])).toEqual([]);
    });

    it('should return an array of actionId string', () => {
      const data = [{ test: true, actionId: 'create' }, { test: 'false', actionId: 'read' }];
      const expected = ['create', 'read'];

      expect(getActionsIds(data)).toEqual(expected);
    });
  });

  describe('getCheckboxesState', () => {
    it('should return an empty object when the properties array is empty', () => {
      const propertiesArray = [];

      expect(getCheckboxesState(propertiesArray)).toEqual({});
    });

    it('should return an object with keys corresponding to the actionId property and their corresponding state', () => {
      const propertiesArray = [
        { actionId: 'content-manager.explorer.create' },
        { actionId: 'content-manager.explorer.read' },
      ];
      const data = {
        address: {
          'content-manager.explorer.create': {
            properties: {
              fields: {
                postal_coder: true,
                categories: true,
                cover: true,
                images: true,
                city: true,
              },
            },
            conditions: {
              'admin::is-creator': false,
              'admin::has-same-role-as-creator': false,
            },
          },
          'content-manager.explorer.read': {
            properties: {
              fields: {
                postal_coder: true,
                categories: false,
                cover: true,
                images: true,
                city: true,
              },
            },
            conditions: {
              'admin::is-creator': false,
              'admin::has-same-role-as-creator': false,
            },
          },
        },
        restaurant: {
          'content-manager.explorer.create': {
            properties: {
              fields: {
                f1: true,
                f2: true,
                services: {
                  name: true,
                  media: true,
                  closing: {
                    name: {
                      test: true,
                    },
                  },
                },
                dz: true,
                relation: true,
              },
              locales: {
                fr: true,
                en: true,
              },
            },
          },
          'content-manager.explorer.read': {
            properties: {
              fields: {
                f1: true,
                f2: true,
                services: {
                  name: true,
                  media: true,
                  closing: {
                    name: {
                      test: true,
                    },
                  },
                },
                dz: true,
                relation: true,
              },
              locales: {
                fr: true,
                en: true,
              },
            },
          },
        },
      };
      const expected = {
        'content-manager.explorer.create': {
          hasAllActionsSelected: true,
          hasSomeActionsSelected: false,
        },
        'content-manager.explorer.read': {
          hasAllActionsSelected: false,
          hasSomeActionsSelected: true,
        },
      };

      expect(getCheckboxesState(propertiesArray, data)).toEqual(expected);
    });

    describe('getRelatedActionIdData', () => {
      it('should return an object with the keys corresponding to the actionId and their corresponding data from the modifiedData', () => {
        const propertiesArray = [
          'content-manager.explorer.create',
          'content-manager.explorer.read',
        ];
        const data = {
          address: {
            'content-manager.explorer.read': {
              properties: {
                enabled: true,
              },
              conditions: {
                'admin::is-creator': false,
                'admin::has-same-role-as-creator': false,
              },
            },
          },
          restaurant: {
            'content-manager.explorer.create': {
              properties: {
                enabled: false,
              },
              conditions: 'test',
            },
            'content-manager.explorer.read': {
              properties: {
                enabled: true,
              },
              conditions: 'test',
            },
          },
        };

        const expected = {
          'content-manager.explorer.create': {
            address: {},
            restaurant: {
              properties: {
                enabled: false,
              },
            },
          },
          'content-manager.explorer.read': {
            address: {
              properties: {
                enabled: true,
              },
            },
            restaurant: {
              properties: {
                enabled: true,
              },
            },
          },
        };

        expect(getRelatedActionIdData(propertiesArray, data)).toEqual(expected);
      });
    });
  });
});
