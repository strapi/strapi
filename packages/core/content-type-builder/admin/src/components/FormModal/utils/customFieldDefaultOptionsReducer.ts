type CustomFieldDefaultOption = {
  name: string;
  defaultValue: unknown;
};

type CustomFieldOption = {
  items?: CustomFieldOption[];
  name?: string;
  defaultValue?: unknown;
};

export const customFieldDefaultOptionsReducer = (
  acc: CustomFieldDefaultOption[],
  option: CustomFieldOption
): CustomFieldDefaultOption[] => {
  if (option.items !== undefined) {
    return option.items.reduce(customFieldDefaultOptionsReducer, acc);
  }

  if ('defaultValue' in option && option.name !== undefined) {
    const { name, defaultValue } = option;
    acc.push({ name, defaultValue });
  }

  return acc;
};
