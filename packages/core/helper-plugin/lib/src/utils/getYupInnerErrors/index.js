/**
 * Extract relevant values from the Yup error that can be used to enhance front
 * end error messaging
 * @param {String} errorType
 * @param {Object} errorParams
 * @returns {Object} values to pass to error translation string
 */
const extractValuesFromYupError = (errorType, errorParams = {}) =>
  Object.keys(errorParams)
    .filter((key) => errorType === key)
    .reduce((current, key) => Object.assign(current, { [key]: errorParams[key] }), {});

const getYupInnerErrors = (error) =>
  (error?.inner || []).reduce((acc, currentError) => {
    acc[currentError.path.split('[').join('.').split(']').join('')] = {
      id: currentError.message,
      defaultMessage: currentError.message,
      values: extractValuesFromYupError(currentError.type, currentError?.params || {}),
    };

    return acc;
  }, {});

export default getYupInnerErrors;
