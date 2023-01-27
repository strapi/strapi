/**
 * Transforms an arrays of plural type to singular one
 * @param {Object[]} types
 * @returns Object[]
 */
const toSingularTypes = (types) => {
  if (!types) {
    return [];
  }

  return types.map((type) => type.substring(0, type.length - 1));
};

export default toSingularTypes;
