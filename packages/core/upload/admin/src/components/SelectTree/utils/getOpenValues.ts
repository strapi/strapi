type Options<T> = {
  value: T;
  parent?: T;
  depth?: number;
  label?: string;
  children?: Options<T>[];
};

type DefaultValue<T> = {
  value?: T;
  label?: string;
};

function getOpenValues<T>(options: Options<T>[], defaultValue: DefaultValue<T> = {}) {
  let values: T[] = [];
  const { value } = defaultValue;
  const option = options.find((option) => option.value === value);

  if (!option) {
    return values;
  }

  values.push(option.value);

  let { parent } = option;

  while (parent !== undefined) {
    // Find the option corresponding to the parent
    const option = options.find(({ value }) => value === parent);

    // Check if option is undefined before accessing its properties
    if (option) {
      values.push(option.value);
      parent = option.parent;
    } else {
      // Break out of the loop if the parent option is not found
      break;
    }
  }

  return values.reverse();
}

export default getOpenValues;
