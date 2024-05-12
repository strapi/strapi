import { strapiID } from '../yup';

describe('validators', () => {
  describe('strapiID', () => {
    test.each([
      [0, true],
      ['0', true],
      [1, true],
      ['1', true],
      [undefined, true], // because it's not required
      [{}, false],
      [[], false],
      [null, false],
    ])('strapiID(): %s => %s', async (value, expectedResult) => {
      let result = true;
      try {
        await strapiID().validate(value);
      } catch (e) {
        result = false;
      }

      expect(result).toBe(expectedResult);
    });

    test.each([
      [0, true],
      ['0', true],
      [1, true],
      ['1', true],
      [undefined, false],
      [{}, false],
      [[], false],
      [null, false],
    ])('strapiID().required(): %s => %s', async (value, expectedResult) => {
      let result = true;
      try {
        await strapiID().required().validate(value);
      } catch (e) {
        result = false;
      }

      expect(result).toBe(expectedResult);
    });

    test.each([
      [0, true],
      ['0', true],
      [1, true],
      ['1', true],
      [undefined, true],
      [{}, false],
      [[], false],
      [null, true],
    ])('strapiID().nullable(): %s => %s', async (value, expectedResult) => {
      let result = true;
      try {
        await strapiID().nullable().validate(value);
      } catch (e) {
        result = false;
      }

      expect(result).toBe(expectedResult);
    });

    test.each([
      [0, true],
      ['0', true],
      [1, true],
      ['1', true],
      [undefined, false],
      [{}, false],
      [[], false],
      [null, true],
    ])('strapiID().nullable().defined(): %s => %s', async (value, expectedResult) => {
      let result = true;
      try {
        await strapiID().nullable().defined().validate(value);
      } catch (e) {
        result = false;
      }

      expect(result).toBe(expectedResult);
    });
  });
});
