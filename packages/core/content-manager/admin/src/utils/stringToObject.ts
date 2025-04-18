export function stringToObject(path, object) {
  const parts = path.split('.');
  const result = {};

  let current = result;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // If it's a number, treat it as an array index
    if (!isNaN(parseInt(part))) {
      const index = parseInt(part);
      const nextPart = parts[i + 1];

      // If the previous part is not an array yet, make it one
      const prevPart = parts[i - 1];
      current[prevPart] = [];

      // Create an object at the specified index
      current[prevPart][index] = nextPart ? {} : {};

      // Move the current pointer to the newly created object
      current = current[prevPart][index];
    } else if (i === parts.length - 1) {
      // If it's the last part, set it to an empty object
      current[part] = {
        ...object,
      };
    }
  }

  return result;
}
