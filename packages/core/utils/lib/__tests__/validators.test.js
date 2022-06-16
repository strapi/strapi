'use strict';

const { yup } = require('../validators');

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
    ])('yup.strapiID(): %s => %s', async (value, expectedResult) => {
      let result = true;
      try {
        await yup.strapiID().validate(value);
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
    ])('yup.strapiID().required(): %s => %s', async (value, expectedResult) => {
      let result = true;
      try {
        await yup
          .strapiID()
          .required()
          .validate(value);
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
    ])('yup.strapiID().nullable(): %s => %s', async (value, expectedResult) => {
      let result = true;
      try {
        await yup
          .strapiID()
          .nullable()
          .validate(value);
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
    ])('yup.strapiID().nullable().defined(): %s => %s', async (value, expectedResult) => {
      let result = true;
      try {
        await yup
          .strapiID()
          .nullable()
          .defined()
          .validate(value);
      } catch (e) {
        result = false;
      }

      expect(result).toBe(expectedResult);
    });
  });
});
