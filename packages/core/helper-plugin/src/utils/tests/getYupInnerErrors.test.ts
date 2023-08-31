import { ValidationError } from 'yup';

import { getYupInnerErrors } from '../getYupInnerErrors';

describe('getYupInnerErrors', () => {
  test('can extract relevant parameters from an error', () => {
    const maxError: ValidationError = {
      value: { number: 6 },
      name: 'ValidationError',
      message: 'components.Input.error.validation.max',
      errors: ['components.Input.error.validation.max'],
      inner: [
        {
          errors: ['components.Input.error.validation.max'],
          message: 'components.Input.error.validation.max',
          name: 'ValidationError',
          params: { value: 6, originalValue: 6, path: 'number', max: 5 },
          path: 'number',
          type: 'max',
          value: 6,
          inner: [],
        },
      ],
    };

    expect(getYupInnerErrors(maxError)).toMatchObject({
      number: {
        id: 'components.Input.error.validation.max',
        defaultMessage: 'components.Input.error.validation.max',
        values: { max: 5 },
      },
    });
  });
});
