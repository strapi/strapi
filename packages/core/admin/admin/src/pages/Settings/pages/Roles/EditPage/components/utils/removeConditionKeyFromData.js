const removeConditionKeyFromData = (obj) => {
  if (!obj) {
    return null;
  }

  return Object.keys(obj).reduce((acc, current) => {
    if (current !== 'conditions') {
      acc[current] = obj[current];
    }

    return acc;
  }, {});
};

export default removeConditionKeyFromData;
