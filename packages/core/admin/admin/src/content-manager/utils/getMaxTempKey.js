const getMaxTempKey = (arr) => {
  if (arr.length === 0) {
    return -1;
  }

  const maxTempKey = Math.max.apply(
    Math,
    arr.map((o) => o.__temp_key__ ?? 0)
  );

  return Number.isNaN(maxTempKey) ? -1 : maxTempKey;
};

export default getMaxTempKey;
