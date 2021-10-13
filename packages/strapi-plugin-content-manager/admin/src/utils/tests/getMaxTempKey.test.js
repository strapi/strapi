import getMaxTempKey from '../getMaxTempKey';

describe('CONTENT MANAGER | utils | getMaxTempKey', () => {
  it('should return -1 is the array is empty', () => {
    expect(getMaxTempKey([])).toEqual(-1);
  });

  it('should return the max of the array', () => {
    const data = [{ __temp_key__: 110 }, { __temp_key__: 111 }, { __temp_key__: 0 }];

    expect(getMaxTempKey(data)).toEqual(111);
  });
});
