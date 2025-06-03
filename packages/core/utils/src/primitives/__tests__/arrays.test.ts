import { includesString } from '../arrays';

describe('string-formatting', () => {
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
    test.each(tests)('%p includes %p : %p', (arr: any, val: unknown, expectedResult: unknown) => {
      const result = includesString(arr, val);
      expect(result).toBe(expectedResult);
    });
  });
});
