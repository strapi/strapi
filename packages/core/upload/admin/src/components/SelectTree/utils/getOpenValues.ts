interface Option {
  value: number | string | null;
  parent?: number | string | null;
}

interface DefaultValue {
  value?: number | string | null;
}

function getOpenValues(options: Option[], defaultValue: DefaultValue = {}) {
  let values: Option['value'][] = [];
  const { value } = defaultValue;
  const option = options.find((option) => option.value === value);

  if (!option) {
    return values;
  }

  values.push(option.value);

  let { parent } = option;

  while (parent !== undefined) {
    const option = options.find(({ value }) => value === parent);

    if (!option) {
      break;
    }

    values.push(option.value);
    parent = option.parent;
  }

  return values.reverse();
}

export default getOpenValues;
