import { getFieldUnits } from '../index';

describe('Content Manager | Inputs | Utils', () => {
  describe('getFieldUnits', () => {
    it('returns <empty> for number types', () => {
      expect(getFieldUnits({ type: 'number' })).toEqual({});
    });

    it('returns <empty> for biginteger types', () => {
      expect(getFieldUnits({ type: 'biginteger' })).toEqual({});
    });

    it('returns <empty> for integer types', () => {
      expect(getFieldUnits({ type: 'integer' })).toEqual({});
    });

    it('correctly returns units translation object', () => {
      expect(getFieldUnits({ type: 'text', minimum: 1, maximum: 5 })).toEqual({
        message: {
          id: 'content-manager.form.Input.hint.character.unit',
          defaultMessage: '{maxValue, plural, one { character} other { characters}}',
        },
        values: {
          maxValue: 5,
        },
      });
    });
  });
});
