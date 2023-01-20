import { getFieldUnits } from '../index';

describe('Content Manager | Inputs | Utils', () => {
  describe('getFieldUnits', () => {
    it('returns <empty string> for number types', () => {
      expect(getFieldUnits({ type: 'number' })).toEqual('');
    });

    it('returns "character" when neither minimum or maximum is greater than 1', () => {
      expect(getFieldUnits({ type: 'text', minimum: 1, maximum: 1 })).toEqual('character');
    });

    it('returns "characters" when either minimum or maximum is greater than 1', () => {
      expect(getFieldUnits({ type: 'text', maximum: 2 })).toEqual('characters');
    });
  });
});
