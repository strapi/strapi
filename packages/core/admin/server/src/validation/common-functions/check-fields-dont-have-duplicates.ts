const checkFieldsDontHaveDuplicates = (fields: unknown) => {
  if (fields === null || fields === undefined) {
    // Only check if the fields exist
    return true;
  }
  if (!Array.isArray(fields)) {
    return false;
  }

  return new Set(fields).size === fields.length;
};

export default checkFieldsDontHaveDuplicates;
