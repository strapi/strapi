/**
 * Prefix message with 'apiError.'
 */
export function getPrefixedId(message: string, callback?: (prefixedMessage: string) => string) {
  const prefixedMessage = `apiError.${message}`;

  // if a prefix function has been passed in it is used to
  // prefix the id, e.g. to allow an error message to be
  // set only for a localization namespace
  if (typeof callback === 'function') {
    return callback(prefixedMessage);
  }

  return prefixedMessage;
}
