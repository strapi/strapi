/**
 * This file is for all helpers related to `paths` in the CM.
 */
import { get } from 'lodash';

/**
 * This is typically used in circumstances where there are re-orderable pieces e.g. Dynamic Zones
 * or Repeatable fields. It finds the _original_ location of the initial data using `__temp_key__` values
 * which are added to the fields in the `INIT_FORM` reducer to give array data a stable (when you add
 * a new item they wont have a server ID).
 */
export const getInitialDataPathUsingTempKeys = (initialData, modifiedData) => (currentPath) => {
  const splitPath = currentPath.split('.');

  return splitPath.reduce((acc, currentValue, index) => {
    const initialDataParent = get(initialData, acc);
    const modifiedDataTempKey = get(modifiedData, [
      ...splitPath.slice(0, index),
      currentValue,
      '__temp_key__',
    ]);

    if (Array.isArray(initialDataParent) && typeof modifiedDataTempKey === 'number') {
      const initialDataIndex = initialDataParent.findIndex(
        (entry) => entry.__temp_key__ === modifiedDataTempKey
      );

      acc.push(initialDataIndex.toString());

      return acc;
    }

    acc.push(currentValue);

    return acc;
  }, []);
};
