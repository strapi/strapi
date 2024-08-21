import type { FlattenedNode } from './flattenTree';

function getValuesToClose<T>(options: FlattenedNode<T>[], value: FlattenedNode<T>['value']) {
  const optionForValue = options.find((option) => option.value === value);

  if (!optionForValue) {
    return [];
  }

  return options
    .filter((option) => option.depth >= optionForValue.depth)
    .map((option) => option.value);
}

export default getValuesToClose;
