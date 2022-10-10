const getCustomFieldDefaultOptions = (options, optionDefaults = []) => {
  options.forEach((option) => {
    if (option.items) {
      getCustomFieldDefaultOptions(option.items, optionDefaults);
    }

    if ('defaultValue' in option) {
      const { name, defaultValue } = option;
      optionDefaults.push({ name, defaultValue });
    }
  });

  return optionDefaults;
};

module.exports = { getCustomFieldDefaultOptions };
