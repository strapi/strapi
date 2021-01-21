const getNextSearch = (nextTab, state) => {
  const newSearch = Object.keys(state).reduce((acc, current, index) => {
    if (state[current] !== null && current !== 'pathToSchema') {
      if (current !== 'settingType') {
        acc = `${acc}${index === 0 ? '' : '&'}${current}=${state[current]}`;
      } else {
        acc = `${acc}${index === 0 ? '' : '&'}${current}=${nextTab}`;
      }
    }

    return acc;
  }, '');

  return newSearch;
};

export default getNextSearch;
