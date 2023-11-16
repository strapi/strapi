import { AxiosError } from 'axios';

/**
 * This asserts the errors from redux-toolkit-query are
 * axios errors so we can pass them to our utility functions
 * to correctly render error messages.
 */
const isErrorAxiosError = (err: unknown): err is AxiosError<{ error: any }> => {
  return (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof err.response === 'object' &&
    err.response !== null &&
    'data' in err.response
  );
};

export { isErrorAxiosError };
