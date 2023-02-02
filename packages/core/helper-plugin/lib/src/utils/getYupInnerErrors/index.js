const getYupInnerErrors = (error) => {
  return (error?.inner || []).reduce((acc, currentError) => {
    acc[currentError.path.split('[').join('.').split(']').join('')] = {
      id: currentError.message,
      defaultMessage: currentError.message,
      values: Object.keys(currentError?.params || {})
        .filter((key) => !['label', 'originalValue', 'path', 'value'].includes(key))
        .reduce((current, key) => Object.assign(current, { [key]: currentError.params[key] }), {}),
    };

    return acc;
  }, {});
};

export default getYupInnerErrors;
