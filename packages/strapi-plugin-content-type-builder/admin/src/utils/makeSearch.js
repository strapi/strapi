const makeSearch = (searchObj, shouldContinue = true) => {
  if (!shouldContinue) {
    return '';
  }

  return Object.keys(searchObj).reduce((acc, current, index) => {
    if (searchObj[current] !== null) {
      acc = `${acc}${index === 0 ? '' : '&'}${current}=${searchObj[current]}`;
    }

    return acc;
  }, '');
};

export default makeSearch;
