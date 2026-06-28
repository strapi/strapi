import clone from 'lodash/clone';
import toPath from 'lodash/toPath';

type PathObject = Record<string, unknown>;
type PathContainer = PathObject | unknown[];

const isPathContainer = (obj: unknown): obj is PathContainer => isObject(obj) || Array.isArray(obj);
const getPathValue = (container: PathContainer, key: string): unknown =>
  (container as PathObject)[key];
const setPathValue = (container: PathContainer, key: string, value: unknown) => {
  (container as PathObject)[key] = value;
};
const deletePathValue = (container: PathContainer, key: string) => {
  delete (container as PathObject)[key];
};

/**
 * Deeply get a value from an object via its path.
 */
export function getIn<TValue>(
  obj: unknown,
  key: string | string[],
  def: TValue,
  pathStartIndex?: number
): TValue;
export function getIn<TValue = unknown>(
  obj: unknown,
  key: string | string[],
  def?: TValue,
  pathStartIndex?: number
): TValue | undefined;
export function getIn<TValue = unknown>(
  obj: unknown,
  key: string | string[],
  def?: TValue,
  pathStartIndex: number = 0
): TValue | undefined {
  const path = toPath(key);
  let currentValue = obj;

  while (isPathContainer(currentValue) && pathStartIndex < path.length) {
    currentValue = getPathValue(currentValue, path[pathStartIndex++]);
  }

  // check if path is not in the end
  if (pathStartIndex !== path.length && isPathContainer(currentValue) === false) {
    return def;
  }

  return (currentValue === undefined ? def : currentValue) as TValue | undefined;
}

/** @internal is the given object an Object? */
export const isObject = (obj: unknown): obj is PathObject =>
  obj !== null && typeof obj === 'object' && !Array.isArray(obj);

/** @internal is the given object an integer? */
export const isInteger = (obj: unknown): boolean => String(Math.floor(Number(obj))) === obj;

/**
 * Deeply set a value from in object via its path. If the value at `path`
 * has changed, return a shallow copy of obj with `value` set at `path`.
 * If `value` has not changed, return the original `obj`.
 *
 * Existing objects / arrays along `path` are also shallow copied. Sibling
 * objects along path retain the same internal js reference. Since new
 * objects / arrays are only created along `path`, we can test if anything
 * changed in a nested structure by comparing the object's reference in
 * the old and new object, similar to how russian doll cache invalidation
 * works.
 *
 * In earlier versions of this function, which used cloneDeep, there were
 * issues whereby settings a nested value would mutate the parent
 * instead of creating a new object. `clone` avoids that bug making a
 * shallow copy of the objects along the update path
 * so no object is mutated in place.
 *
 * Before changing this function, please read through the following
 * discussions.
 *
 * @see https://github.com/developit/linkstate
 * @see https://github.com/jaredpalmer/formik/pull/123
 */
export function setIn<TValue>(obj: TValue, path: string, value: unknown): TValue {
  const res = clone(obj); // this keeps inheritance when obj is a class
  let resVal = res as PathContainer;
  let i = 0;
  const pathArray = toPath(path);

  for (; i < pathArray.length - 1; i++) {
    const currentPath: string = pathArray[i];
    const currentObj = getIn(obj, pathArray.slice(0, i + 1));

    if (isObject(currentObj) || Array.isArray(currentObj)) {
      const clonedValue = clone(currentObj) as PathContainer;
      setPathValue(resVal, currentPath, clonedValue);
      resVal = clonedValue;
    } else {
      const nextPath: string = pathArray[i + 1];
      const nextValue: PathContainer = isInteger(nextPath) && Number(nextPath) >= 0 ? [] : {};
      setPathValue(resVal, currentPath, nextValue);
      resVal = nextValue;
    }
  }

  // Return original object if new value is the same as current
  const currentValue =
    isPathContainer(obj) && i === 0
      ? getPathValue(obj, pathArray[i])
      : getPathValue(resVal, pathArray[i]);
  if (currentValue === value) {
    return obj;
  }

  if (value === undefined) {
    deletePathValue(resVal, pathArray[i]);
  } else {
    setPathValue(resVal, pathArray[i], value);
  }

  // If the path array has a single element, the loop did not run.
  // Deleting on `resVal` had no effect in this scenario, so we delete on the result instead.
  if (i === 0 && value === undefined) {
    deletePathValue(res as PathContainer, pathArray[i]);
  }

  return res;
}
