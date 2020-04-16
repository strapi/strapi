import generateRows from '../generateRows';

describe('MEDIA LIBRARY | components | ListEmpty | utils', () => {
  describe('generateRows', () => {
    it('should return an array of object', () => {
      const numberOfRows = 4;
      const expected = [
        {
          key: 0,
          rows: [0, 1, 2, 3],
        },
        {
          key: 1,
          rows: [0, 1, 2, 3],
        },
        {
          key: 2,
          rows: [0, 1, 2, 3],
        },
        {
          key: 3,
          rows: [0, 1, 2],
        },
      ];

      expect(generateRows(numberOfRows)).toEqual(expected);
    });
  });
});
