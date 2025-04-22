/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Type that can represent a nested structure of objects and arrays
 */
type NestedObject = {
  [key: string]: any;
};

/**
 * Converts a dot-notation path string and a value into a nested object structure
 * @param path - Dot-notation path string (e.g., "a.b.0.c")
 * @param value - The value to set at the specified path
 * @returns A nested object with the value set at the specified path
 */
export function stringToObject(path: string, value: any): NestedObject {
  const parts = path.split('.');
  const result: NestedObject = {};

  let current: NestedObject = result;
  let prev: NestedObject | null = null;
  let prevKey: string = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLastPart = i === parts.length - 1;
    const isNumeric = !isNaN(parseInt(part));

    // If current part is numeric, we need to handle array creation
    if (isNumeric) {
      const index = parseInt(part);

      // If this is not the first part, we need to ensure the previous part exists as an array
      if (i > 0 && prev) {
        if (!Array.isArray(prev[prevKey])) {
          prev[prevKey] = [];
        }

        // Ensure the array has enough elements
        while (prev[prevKey].length <= index) {
          prev[prevKey].push({});
        }

        current = prev[prevKey][index];
      }
    } else {
      // Handle regular object properties
      if (isLastPart) {
        current[part] = value;
      } else {
        if (!(part in current)) {
          // Check if the next part is numeric to determine if we need an array or object
          const nextPart = parts[i + 1];
          const nextIsNumeric = !isNaN(parseInt(nextPart));

          current[part] = nextIsNumeric ? [] : {};
        }

        prev = current;
        prevKey = part;
        current = current[part];
      }
    }
  }

  return result;
}
