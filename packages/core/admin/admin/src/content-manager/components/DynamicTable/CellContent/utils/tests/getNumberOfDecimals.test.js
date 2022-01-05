import { getNumberOfDecimals } from '../getNumberOfDecimals';

describe('getNumberOfDecimals', () => {
  it('should be 4 decimals', () => {
    const numberOfDecimals = getNumberOfDecimals(3.1415);
    expect(numberOfDecimals).toEqual(4);
  });

  it('should be 1 decimals', () => {
    const numberOfDecimals = getNumberOfDecimals(3.1);
    expect(numberOfDecimals).toEqual(1);
  });

  it('should be 0 decimals', () => {
    const numberOfDecimals = getNumberOfDecimals(3);
    expect(numberOfDecimals).toEqual(0);
  });
});
