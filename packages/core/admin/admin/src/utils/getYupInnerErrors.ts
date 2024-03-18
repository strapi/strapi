import type { MessageDescriptor, PrimitiveType } from 'react-intl';
import type { ValidationError } from 'yup';

interface TranslationMessage extends MessageDescriptor {
  values?: Record<string, PrimitiveType>;
}

const extractValuesFromYupError = (
  errorType?: string | undefined,
  errorParams?: Record<string, any> | undefined
) => {
  if (!errorType || !errorParams) {
    return {};
  }

  return {
    [errorType]: errorParams[errorType],
  };
};

const getYupInnerErrors = (error: ValidationError) =>
  (error?.inner || []).reduce<Record<string, TranslationMessage>>((acc, currentError) => {
    if (currentError.path) {
      acc[currentError.path.split('[').join('.').split(']').join('')] = {
        id: currentError.message,
        defaultMessage: currentError.message,
        values: extractValuesFromYupError(currentError?.type, currentError?.params),
      };
    }

    return acc;
  }, {});

export { getYupInnerErrors };
