function getOpenValues(options, defaultValue) {
  let values = [];
  const { value } = defaultValue;
  const option = options.find(option => option.value === value);

  if (!option) {
    return values;
  }

  values.push(option.value);

  let { parent } = option;

  while (parent) {
    // eslint-disable-next-line no-loop-func
    const option = options.find(({ value }) => value === parent);

    values.push(option.value);
    parent = option.parent;
  }

  return values;
}

export default getOpenValues;
