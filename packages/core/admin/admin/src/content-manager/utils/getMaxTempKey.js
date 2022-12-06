const getMaxTempKey = (arr) => {
  if (arr.length === 0) {
    return -1;
  }

  return Math.max.apply(
    Math,
    arr.map((o) => o.__temp_key__ ?? o.id)
  );
};

export default getMaxTempKey;
