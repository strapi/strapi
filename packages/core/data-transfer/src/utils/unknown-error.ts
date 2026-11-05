const messageFromUnknown = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown error';
};

/**
 * Preserve an Error. A string becomes its message. Anything else becomes a
 * generic Error, because stringifying an object yields "[object Object]".
 */
export const errorFromUnknown = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  return new Error(messageFromUnknown(error));
};

export const errorMessageFromUnknown = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return messageFromUnknown(error);
};
