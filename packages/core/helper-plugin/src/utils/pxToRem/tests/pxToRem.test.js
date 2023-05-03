import pxToRem from '../../pxToRem';

describe('HELPER_PLUGIN | utils | pxToRem', () => {
  it('should return 2rem if data is 32', () => {
    const data = 32;
    const expected = '2rem';

    expect(pxToRem(data)).toEqual(expected);
  });

  it('should return 1rem if data is 16', () => {
    const data = 16;
    const expected = '1rem';

    expect(pxToRem(data)).toEqual(expected);
  });
});
