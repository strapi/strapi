import isFieldTypeNumber from '../isFieldTypeNumber';

const FIXTURE = [
  ['integer', true],
  ['float', true],
  ['decimal', true],
  ['biginteger', true],
  ['number', true],
  ['text', false],
];

describe('isFieldTypeNumber', () => {
  FIXTURE.forEach(([type, expectation]) => {
    test(`${type} is ${expectation}`, () => {
      expect(isFieldTypeNumber(type)).toBe(expectation);
    });
  });
});
