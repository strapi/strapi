// TODO: check if this function is used because the only component that uses it is the AssetDialog component and I am not sure it is used anymore

const move = (array, oldIndex, newIndex) => {
  if (newIndex >= array.length) {
    newIndex = array.length - 1;
  }
  array.splice(newIndex, 0, array.splice(oldIndex, 1)[0]);

  return array;
};

export const moveElement = (array, index, offset) => {
  const newIndex = index + offset;

  return move(array, index, newIndex);
};
