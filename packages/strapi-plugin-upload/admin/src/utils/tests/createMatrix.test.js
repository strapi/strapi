import createMatrix from '../createMatrix';

describe('UPLOAD | utils | createMatrix', () => {
  it('should create 2D array with and 1D array as argument', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const expected = [
      {
        key: 0,
        rowContent: [1, 2, 3, 4],
      },
      {
        key: 1,
        rowContent: [5, 6, 7, 8],
      },
      {
        key: 2,
        rowContent: [9, 10],
      },
    ];

    expect(createMatrix(data)).toEqual(expected);
  });

  it('should return an empty array', () => {
    const data = [];
    const expected = [];

    expect(createMatrix(data)).toEqual(expected);
  });
});
