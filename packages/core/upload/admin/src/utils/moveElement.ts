// TODO: check if this function is used because the only component that uses it is the AssetDialog component and I am not sure it is used anymore
import type { Data } from '@strapi/types';

type ArrayProp = {
  id: Data.ID;
}[];

const move = (array: ArrayProp, oldIndex: number, newIndex: number) => {
  if (newIndex >= array.length) {
    newIndex = array.length - 1;
  }
  array.splice(newIndex, 0, array.splice(oldIndex, 1)[0]);

  return array;
};

export const moveElement = (array: ArrayProp, index: number, offset: number) => {
  const newIndex = index + offset;

  return move(array, index, newIndex);
};
