const ERROR_PREFIX = 'apiError.';

export function getPrefixedId(message, callback) {
  const prefixedMessage = `${ERROR_PREFIX}${message}`;

  // if a prefix function has been passed in it is used to
  // prefix the id, e.g. to allow an error message to be
  // set only for a localization namespace
  if (typeof callback === 'function') {
    return callback(prefixedMessage);
  }

  return prefixedMessage;
}
