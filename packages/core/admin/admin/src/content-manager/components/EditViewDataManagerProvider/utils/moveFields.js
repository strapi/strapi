const moveFields = (initialValue, from, to, value) => {
  const returnedValue = initialValue.slice();

  returnedValue.splice(from, 1);
  returnedValue.splice(to, 0, value);

  return returnedValue;
};

export default moveFields;
