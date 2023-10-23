const getMaxTempKey = (arr) => {
  if (arr.length === 0) {
    return -1;
  }

  /**
   * We check if there are ids or __temp_key__ because you may add an object to a list of objects
   * already in the DB.
   */
  const maxTempKey = Math.max.apply(
    Math,
    arr.map((o) => o.id ?? o.__temp_key__ ?? 0)
  );

  return Number.isNaN(maxTempKey) ? -1 : maxTempKey;
};

export default getMaxTempKey;
