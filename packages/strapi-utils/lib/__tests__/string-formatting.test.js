'use strict';

const { escapeQuery, stringIncludes, stringEquals } = require('../string-formatting');

describe('string-formatting', () => {
  describe('Escape Query', () => {
    const testData = [
      // [query, charsToEscape, escapeChar, expectedResult]
      ['123', '[%\\', '\\', '123'],
      ['12%3', '[%\\', '\\', '12\\%3'],
      ['1[2%3', '[%\\', '\\', '1\\[2\\%3'],
      ['1\\23', '[%\\', '\\', '1\\\\23'],
      ['123\\', '[%\\', '\\', '123\\\\'],
      ['\\', '[%\\', '\\', '\\\\'],
      ['123', '[%\\', '+', '123'],
      ['12%3', '[%\\', '+', '12+%3'],
      ['1[2%3', '[%\\', '+', '1+[2+%3'],
      ['1\\23', '[%\\', '+', '1+\\23'],
    ];

    test.each(testData)(
      'Escaping %s from %s with %s',
      (query, charsToEscape, escapeChar, expectedResult) => {
        const result = escapeQuery(query, charsToEscape, escapeChar);
        expect(result).toEqual(expectedResult);
      }
    );
  });

  describe('stringIncludes', () => {
    const tests = [
      [['1', '2', '3'], '1', true],
      [['1', '2', '3'], '4', false],
      [[1, 2, 3], 1, true],
      [[1, 2, 3], 4, false],
      [[1, 2, 3], '1', true],
      [[1, 2, 3], '4', false],
      [[1, 2, 3], '01', false],
      [['1', '2', '3'], 1, true],
      [['1', '2', '3'], 4, false],
      [['01', '02', '03'], 1, false],
    ];
    test.each(tests)('%p includes %p : %p', (arr, val, expectedResult) => {
      const result = stringIncludes(arr, val);
      expect(result).toBe(expectedResult);
    });
  });

  describe('stringEquals', () => {
    const tests = [
      ['1', '1', true],
      ['1', '4', false],
      [1, 1, true],
      [1, 4, false],
      [1, '1', true],
      [1, '4', false],
      [1, '01', false],
      ['1', 1, true],
      ['1', 4, false],
      ['01', 1, false],
    ];
    test.each(tests)('%p includes %p : %p', (a, b, expectedResult) => {
      const result = stringEquals(a, b);
      expect(result).toBe(expectedResult);
    });
  });
});
