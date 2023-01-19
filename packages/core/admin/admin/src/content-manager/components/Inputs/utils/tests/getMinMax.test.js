import getMinMax from '../getMinMax';

describe('Content Manager | Inputs | Utils', () => {
  describe('getMinMax', () => {
    it('ignores a blank schema', () => {
      expect(getMinMax({})).toEqual({ inputMaximum: undefined, inputMinimum: undefined });
    });

    it('ignores values provided as strings that cannot be parsed to integers', () => {
      const notANumber = 'NOT_A_NUMBER';
      const fieldSchema = {
        min: notANumber,
        max: notANumber,
        minLength: notANumber,
        maxLength: notANumber,
      };
      expect(getMinMax(fieldSchema)).toEqual({ inputMaximum: undefined, inputMinimum: undefined });
    });

    it('correctly parses integer values from strings', () => {
      const fieldSchema = {
        min: '2',
        max: '5',
      };
      expect(getMinMax(fieldSchema)).toEqual({ inputMaximum: 5, inputMinimum: 2 });
    });

    it('returns based on minLength and maxLength values', () => {
      const fieldSchema = {
        minLength: 10,
        maxLength: 20,
      };

      expect(getMinMax(fieldSchema)).toEqual({ inputMaximum: 20, inputMinimum: 10 });
    });

    it('returns based on min and max values', () => {
      const fieldSchema = {
        min: 10,
        max: 20,
      };

      expect(getMinMax(fieldSchema)).toEqual({ inputMaximum: 20, inputMinimum: 10 });
    });
  });
});
