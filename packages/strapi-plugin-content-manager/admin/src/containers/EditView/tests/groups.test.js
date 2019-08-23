import {
  getDefaultGroupValues,
  // retrieveDisplayedGroups,
  // retrieveGroupLayoutsToFetch,
} from '../utils/groups';

describe('Content Manager | EditView | utils | groups', () => {
  describe('getDefaultGroupValues', () => {
    it('should return an empty object if the args are empty', () => {
      expect(getDefaultGroupValues([], {})).toEqual({});
    });

    it('should return an object with empty keys', () => {
      console.log(
        getDefaultGroupValues(
          [
            // {
            //   key: 'closing_period',
            //   group: 'closingperiod',
            //   repeatable: undefined,
            //   isOpen: true,
            //   min: undefined,
            // },
          ],
          {}
        )
      );
    });
  });
});
