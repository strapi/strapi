export const toSingularTypes = (types?: string[]) => {
  if (!types) {
    return [];
  }

  return types.map((type) => type.substring(0, type.length - 1));
};
