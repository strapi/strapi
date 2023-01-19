import { getFieldUnits } from '../index';

describe('Content Manager | Inputs | Utils', () => {
  describe('getFieldUnits', () => {
    it('returns <empty string> for number types', () => {
      expect(getFieldUnits({ type: 'number' })).toEqual('');
    });

    it('returns <empty string> for BIGINT types', () => {
      expect(getFieldUnits({ name: 'BIGINT' })).toEqual('');
    });

    it('returns "character" for other types when neither minimum or maximum is greater than 1', () => {
      expect(getFieldUnits({ type: 'text', minimum: 1, maximum: 1 })).toEqual('character');
    });

    it('returns "characters" for other types when neither minimum or maximum is greater than 0', () => {
      expect(getFieldUnits({ type: 'text', maximum: 2 })).toEqual('characters');
    });
  });
});
