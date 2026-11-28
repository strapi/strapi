import { isEqual, getCommonPath, toRegressedEnumValue, joinBy } from '../strings';

describe('string-formatting', () => {
  describe('isEqual', () => {
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
      const result = isEqual(a, b);
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
      [['-', 'a--', '--b--', '--c'], 'a-b-c'],
      [['^', '^a^', '^b^'], '^a^b^'],
      [[']', 'a]]', ']]b'], 'a]b'],
      [['\\', 'a\\', '\\b'], 'a\\b'],
      [['/.', 'a./', '/.b./', './c'], 'a/.b/.c'],
    ])('%s => %s', (args, expectedResult) => {
      const [joint, ...rest] = args;
      expect(joinBy(joint, ...rest)).toBe(expectedResult);
    });

    test('treats a nullish segment as empty, like lodash trim', () => {
      expect(joinBy('/', null as unknown as string, 'b')).toBe('/b');
      expect(joinBy('/', 'a', undefined as unknown as string)).toBe('a/');
    });
  });
});
