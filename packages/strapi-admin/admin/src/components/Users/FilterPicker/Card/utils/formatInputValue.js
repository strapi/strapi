const getInputValue = (type, value) => {
  if (type === 'booleanSelect') {
    return value === 'string';
  }

  return value;
};

export default getInputValue;
