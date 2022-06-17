'use strict';

const {
  escapeQuery,
  stringIncludes,
  stringEquals,
  getCommonBeginning,
  getCommonPath,
  toRegressedEnumValue,
  joinBy,
} = require('../string-formatting');

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

  describe('getCommonBeginning', () => {
    const tests = [
      [['abcd', 'abc', 'ab'], 'ab'],
      [['abcd', 'abc'], 'abc'],
      [['ab/cd', 'ab/c'], 'ab/c'],
      [['abc', 'abc'], 'abc'],
    ];
    test.each(tests)('%p has common beginning: %p', (a, expectedResult) => {
      const result = getCommonBeginning(...a);
      expect(result).toBe(expectedResult);
    });
  });

  describe('getCommonPath', () => {
    const tests = [
      [['abc', 'ab'], ''],
      [['http://ab.com/cd', 'http://ab.com/c'], 'http://ab.com'],
      [['http://ab.com/admin', 'http://ab.com/api'], 'http://ab.com'],
      [['http://ab.com/admin', 'http://ab.com/admin/'], 'http://ab.com/admin'],
      [['http://ab.com/admin', 'http://ab.com/admin'], 'http://ab.com/admin'],
    ];
    test.each(tests)('%p has common path: %p', (a, expectedResult) => {
      const result = getCommonPath(...a);
      expect(result).toBe(expectedResult);
    });
  });

  describe('toRegressedEnumValue', () => {
    test.each([
      ['', ''],
      ['a', 'a'],
      ['aa', 'aa'],
      ['aBa', 'aBa'],
      ['ABa', 'ABa'],
      ['ABA', 'ABA'],
      ['a a', 'a_a'],
      ['aa aa', 'aa_aa'],
      ['aBa aBa', 'aBa_aBa'],
      ['ABa ABa', 'ABa_ABa'],
      ['ABA ABA', 'ABA_ABA'],
      ['û', 'u'],
      ['Û', 'U'],
      ['München', 'Muenchen'],
      ['Baden-Württemberg', 'Baden_Wuerttemberg'],
      ['test_test', 'test_test'],
    ])('%s => %s', (string, expectedResult) => {
      expect(toRegressedEnumValue(string)).toBe(expectedResult);
    });
  });

  describe('joinBy', () => {
    test.each([
      [['/', ''], ''],
      [['/', '/a/'], '/a/'],
      [['/', 'a', 'b'], 'a/b'],
      [['/', 'a', '/b'], 'a/b'],
      [['/', 'a/', '/b'], 'a/b'],
      [['/', 'a/', 'b'], 'a/b'],
      [['/', 'a//', 'b'], 'a/b'],
      [['/', 'a//', '//b'], 'a/b'],
      [['/', 'a', '//b'], 'a/b'],
      [['/', '/a//', '//b/'], '/a/b/'],
      [['/', 'a', 'b', 'c'], 'a/b/c'],
      [['/', 'a/', '/b/', '/c'], 'a/b/c'],
      [['/', 'a//', '//b//', '//c'], 'a/b/c'],
      [['/', '///a///', '///b///', '///c///'], '///a/b/c///'],
    ])('%s => %s', (args, expectedResult) => {
      expect(joinBy(...args)).toBe(expectedResult);
    });
  });
});
