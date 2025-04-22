/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Deep merges two objects with special handling for arrays and nested properties
 * @param {Object} target - The target object to merge into
 * @param {Object} source - The source object to merge from
 * @return {Object} - The merged object
 */
export function deepMerge(target: any, source: { [x: string]: any }) {
  // Make a copy of the target to avoid mutation
  const result = { ...target };

  if (!source) return result;

  // Loop through each key in the source object
  Object.keys(source).forEach((key) => {
    // If the key doesn't exist in target, just assign it
    if (!(key in result)) {
      result[key] = source[key];
      return;
    }

    // Handle arrays with __temp_key__ matching
    if (Array.isArray(result[key]) && Array.isArray(source[key])) {
      // For arrays like 'dz', we need to merge objects based on __temp_key__ if present
      if (
        result[key].length > 0 &&
        source[key].length > 0 &&
        (result[key][0].__temp_key__ || source[key][0].__temp_key__)
      ) {
        // Create a map to quickly find matching objects
        const targetMap: { [key: string]: any } = {};
        result[key].forEach((item: any) => {
          if (item.__temp_key__) {
            targetMap[item.__temp_key__] = item;
          }
        });

        // Go through each source item
        source[key].forEach((sourceItem: any, index: number) => {
          if (sourceItem.__temp_key__ && targetMap[sourceItem.__temp_key__]) {
            // If we have a matching item in target, deep merge them
            result[key][
              result[key].findIndex(
                (item: { __temp_key__: any }) => item.__temp_key__ === sourceItem.__temp_key__
              )
            ] = deepMerge(targetMap[sourceItem.__temp_key__], sourceItem);
          } else if (index < result[key].length) {
            // If no __temp_key__ but we have an item at the same index, merge them
            result[key][index] = deepMerge(result[key][index], sourceItem);
          } else {
            // Otherwise add as a new item
            result[key].push(sourceItem);
          }
        });
      } else {
        // Simple array merge for arrays without __temp_key__
        result[key] = [...result[key]];
        source[key].forEach((item: any, index: number) => {
          if (index < result[key].length) {
            result[key][index] = deepMerge(result[key][index], item);
          } else {
            result[key].push(item);
          }
        });
      }
    }
    // Handle nested objects (but not arrays)
    else if (
      typeof result[key] === 'object' &&
      result[key] !== null &&
      typeof source[key] === 'object' &&
      source[key] !== null &&
      !Array.isArray(result[key]) &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(result[key], source[key]);
    }
    // For primitive values or when types don't match, use the source value
    else {
      result[key] = source[key];
    }
  });

  return result;
}
