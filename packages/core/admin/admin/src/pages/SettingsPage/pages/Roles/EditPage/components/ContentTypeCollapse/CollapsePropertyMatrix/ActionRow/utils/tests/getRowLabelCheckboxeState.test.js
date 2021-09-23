import getRowLabelCheckboxeState, {
  getActionIdsFromPropertyActions,
} from '../getRowLabelCheckboxeState';

describe('ADMIN | COMPONENTS | PERMISSIONS | ContentTypeCollapse | CollapsePropertyMatrix | ActionRow | utils', () => {
  describe('getActionIdsFromPropertyActions', () => {
    it('should return an array of actionId string', () => {
      const data = [
        { actionId: 'create', isActionRelatedToCurrentProperty: true },
        { actionId: 'read', isActionRelatedToCurrentProperty: true },
      ];
      const expected = ['create', 'read'];

      expect(getActionIdsFromPropertyActions(data)).toEqual(expected);
    });

    it('should filter the actions that are not related to the current property', () => {
      const data = [
        { actionId: 'create', isActionRelatedToCurrentProperty: true },
        { actionId: 'read', isActionRelatedToCurrentProperty: false },
      ];
      const expected = ['create'];

      expect(getActionIdsFromPropertyActions(data)).toEqual(expected);
    });
  });

  describe('getRowLabelCheckboxeState', () => {
    it('should return an object with the has hasAllActionsSelected and hasSomeActionsSelected set to false when the propertyActions is empty', () => {
      expect(getRowLabelCheckboxeState([])).toEqual({
        hasAllActionsSelected: false,
        hasSomeActionsSelected: false,
      });
    });

    it('should return state of the row left checkbox', () => {
      const propertyActions = [
        { actionId: 'create', isActionRelatedToCurrentProperty: true },
        { actionId: 'read', isActionRelatedToCurrentProperty: true },
      ];
      const modifiedData = {
        collectionTypes: {
          address: {
            read: {
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
            create: {
              properties: {
                fields: {
                  f1: true,
                },
                locales: {
                  en: true,
                },
              },
              conditions: false,
            },
            read: {
              properties: {
                fields: {
                  f1: false,
                },
                locales: {
                  en: false,
                },
              },
              conditions: false,
            },
          },
        },
      };
      const pathToContentType = 'collectionTypes..restaurant';
      const propertyToCheck = 'fields';
      const targetKey = 'f1';
      const expected = { hasAllActionsSelected: false, hasSomeActionsSelected: true };

      expect(
        getRowLabelCheckboxeState(
          propertyActions,
          modifiedData,
          pathToContentType,
          propertyToCheck,
          targetKey
        )
      ).toEqual(expected);
    });
  });
});
