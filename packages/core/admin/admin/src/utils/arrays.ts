/**
 * @internal
 * @description Mutates a value to be a union of flat values, no arrays allowed.
 */
type Flat<T> = T extends string ? T : T extends ArrayLike<any> ? never : T;

/**
 * @internal
 */
interface RecursiveArray<T> extends Array<T | RecursiveArray<T>> {}
/**
 * @internal
 */
interface ArrayOfRecursiveArraysOrValues<T> extends ArrayLike<T | RecursiveArray<T>> {}

/**
 * @internal
 *
 * @description Flattens an array recursively.
 */
const flattenDeep = <T>(
  array?: ArrayOfRecursiveArraysOrValues<T> | null | undefined
): Array<Flat<T>> => {
  if (Array.isArray(array)) {
    return array.reduce(
      (acc, value) => {
        if (Array.isArray(value)) {
          acc.push(...flattenDeep(value));
        } else {
          acc.push(value);
        }

        return acc;
      },
      [] as Array<Flat<T>>
    );
  } else {
    return [];
  }
};

export { flattenDeep };
export type { Flat, RecursiveArray, ArrayOfRecursiveArraysOrValues };
