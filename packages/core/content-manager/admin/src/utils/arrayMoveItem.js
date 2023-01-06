import cloneDeep from 'lodash/cloneDeep';

const arrayMoveItem = (arr, from, to) => {
  if (
    Array.isArray(arr) &&
    from >= 0 &&
    to >= 0 &&
    from <= arr.length - 1 &&
    to <= arr.length - 1
  ) {
    const newArray = cloneDeep(arr);

    const item = newArray.splice(from, 1);
    newArray.splice(to, 0, item[0]);

    return newArray;
  }

  return arr;
};

export default arrayMoveItem;
