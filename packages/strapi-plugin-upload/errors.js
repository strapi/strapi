const entityTooLarge = message => {
  const error = new Error(message || 'Entity too large');
  error.type = 'entityTooLarge';
  return error;
};

const unknownError = message => {
  const error = new Error(message || 'Unknown error');
  error.type = 'unknownError';
  return error;
};

module.exports = {
  entityTooLarge,
  unknownError,
};
