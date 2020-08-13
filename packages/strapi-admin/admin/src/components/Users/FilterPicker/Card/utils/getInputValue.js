const getInputValue = (type, value) => {
  if (type === 'booleanSelect') {
    return value.toString();
  }

  return value;
};

export default getInputValue;
