function getValuesToClose(options, value) {
  const optionForValue = options.find(option => option.value === value);

  return options.filter(option => option.depth >= optionForValue.depth).map(option => option.value);
}

export default getValuesToClose;
