/**
 * Extract relevant values from the Yup error that can be used to enhance front
 * end error messaging
 * @param {Object} yupErrorParams
 * @returns {Object}
 */
const extractValuesFromYupError = (yupErrorParams = {}) =>
  Object.keys(yupErrorParams)
    .filter((key) => !['label', 'originalValue', 'path', 'value'].includes(key))
    .reduce((current, key) => Object.assign(current, { [key]: yupErrorParams[key] }), {});

const getYupInnerErrors = (error) => {
  return (error?.inner || []).reduce((acc, currentError) => {
    acc[currentError.path.split('[').join('.').split(']').join('')] = {
      id: currentError.message,
      defaultMessage: currentError.message,
      values: extractValuesFromYupError(currentError?.params || {}),
    };

    return acc;
  }, {});
};

export default getYupInnerErrors;
