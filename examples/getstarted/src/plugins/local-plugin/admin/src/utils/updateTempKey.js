import { generateKeyBetween } from 'fractional-indexing';

export function getNewTempKey(index, components) {
  const nextKey = generateKeyBetween(
    components[index]?.__temp_key__,
    components[index + 1]?.__temp_key__
  );

  return nextKey;
}
