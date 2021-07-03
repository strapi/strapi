import arrayMoveItem from '../arrayMoveItem';

describe('CONTENT MANAGER | utils | arrayMoveItem', () => {
  it('should move the fourth item to the first position', () => {
    const arr = [1, 2, 3, 4, 5];
    const expected = [4, 1, 2, 3, 5];
    expect(arrayMoveItem(arr, 3, 0)).toEqual(expected);
  });

  it('should do nothing if there is only one item', () => {
    const arr = [1];
    expect(arrayMoveItem(arr, 3, 0)).toEqual(arr);
  });

  it('should do nothing if there indices are wrong', () => {
    const arr = [1, 2, 3, 4];
    expect(arrayMoveItem(arr, -12, 23)).toEqual(arr);
  });
});
