const move = <T = number>(array: T[], oldIndex: number, newIndex: number) => {
  if (newIndex >= array.length) {
    newIndex = array.length - 1;
  }
  array.splice(newIndex, 0, array.splice(oldIndex, 1)[0]);

  return array;
};

export const moveElement = <T = number>(array: T[], index: number, offset: number) => {
  const newIndex = index + offset;

  return move(array, index, newIndex);
};
