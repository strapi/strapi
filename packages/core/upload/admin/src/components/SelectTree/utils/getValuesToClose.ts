interface Option {
  value: string | number | null;
  depth: number;
}

export function getValuesToClose(options: Option[], value: number | string | null) {
  const optionForValue = options.find((option) => option.value === value);

  if (!optionForValue) {
    return [];
  }

  return options
    .filter((option) => option.depth >= optionForValue.depth)
    .map((option) => option.value);
}
