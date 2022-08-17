import { getIndexFromColAndRow } from '../getIndexFromColAndRow';

const FIXTURE = [
  [[0, 0, 2], 0],

  [[1, 0, 2], 1],

  [[0, 1, 2], 2],

  [[0, 2, 2], 4],

  [[1, 4, 2], 9],
];

describe('getIndexFromColAndRow', () => {
  FIXTURE.forEach(([input, expected]) => {
    test(`returns ${expected} for ${JSON.stringify(input)}`, () => {
      expect(getIndexFromColAndRow(...input)).toBe(expected);
    });
  });
});
