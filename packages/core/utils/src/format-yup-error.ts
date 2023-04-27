import { isEmpty, toPath } from 'lodash/fp';
import { ValidationError } from 'yup';

const formatYupInnerError = (yupError: ValidationError) => ({
  path: toPath(yupError.path),
  message: yupError.message,
  name: yupError.name,
});

const formatYupErrors = (yupError: ValidationError) => ({
  errors: isEmpty(yupError.inner)
    ? [formatYupInnerError(yupError)]
    : yupError.inner.map(formatYupInnerError),
  message: yupError.message,
});

export { formatYupErrors };
