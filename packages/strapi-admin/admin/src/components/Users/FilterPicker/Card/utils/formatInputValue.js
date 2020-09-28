const getInputValue = (type, value) => {
  if (type === 'booleanSelect') {
    return value === 'true';
  }

  return value;
};

export default getInputValue;
