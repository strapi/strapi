const { errorTypes } = require('./constants');

const entityTooLarge = message => {
  const error = new Error(message || 'Entity too large');
  error.type = errorTypes.ENTITY_TOO_LARGE;
  return error;
};

const unknownError = message => {
  const error = new Error(message || 'Unknown error');
  error.type = errorTypes.UNKNOWN_ERROR;
  return error;
};

module.exports = {
  entityTooLarge,
  unknownError,
};
