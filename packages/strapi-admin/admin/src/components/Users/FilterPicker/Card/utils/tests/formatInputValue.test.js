import formatInputValue from '../formatInputValue';
import getInputValue from '../getInputValue';

describe('ADMIN | COMPONENTS | USER | FilterPicker | Card | utils', () => {
  describe('formatInputValue', () => {
    it('should return a boolean if the type is booleanSelect', () => {
      const type = 'booleanSelect';

      expect(formatInputValue(type, 'true')).toBeTruthy();
      expect(formatInputValue(type, 'false')).toBeFalsy();
      expect(formatInputValue(type, 'test')).toBeFalsy();
    });

    it('should return the value if the type is not booleanSelect', () => {
      const type = 'test';

      expect(formatInputValue(type, 'true')).toEqual('true');
      expect(formatInputValue(type, 'false')).toEqual('false');
    });
  });

  describe('getInputValue', () => {
    it('should return a string if the type is booleanSelect', () => {
      const type = 'booleanSelect';

      expect(getInputValue(type, true)).toEqual('true');
    });

    it('should return the value if the type is not booleanSelect', () => {
      const type = 'test';

      expect(getInputValue(type, true)).toEqual(true);
    });
  });
});
