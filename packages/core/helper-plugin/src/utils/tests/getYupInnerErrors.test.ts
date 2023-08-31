import { ValidationError } from 'yup';

import { getYupInnerErrors } from '../getYupInnerErrors';

describe('getYupInnerErrors', () => {
  test('can extract relevant parameters from an error', () => {
    const maxError = {
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
    } satisfies ValidationError;

    expect(getYupInnerErrors(maxError)).toMatchObject({
      number: {
        id: 'components.Input.error.validation.max',
        defaultMessage: 'components.Input.error.validation.max',
        values: { max: 5 },
      },
    });
  });

  test('can extract error messages from multiple errors', () => {
    const multipleErrors = {
      value: { number: 6, json: 'invalid json' },
      name: 'ValidationError',
      message: '2 errors occurred',
      errors: ['components.Input.error.validation.json', 'components.Input.error.validation.max'],
      inner: [
        {
          errors: ['components.Input.error.validation.json'],
          message: 'components.Input.error.validation.json',
          name: 'ValidationError',
          params: { value: 'invalid json', originalValue: 'invalid json', path: 'json' },
          path: 'json',
          type: 'isJSON',
          value: 'invalid json',
          inner: [],
        },
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
    } satisfies ValidationError;

    expect(getYupInnerErrors(multipleErrors)).toMatchObject({
      json: {
        id: 'components.Input.error.validation.json',
        defaultMessage: 'components.Input.error.validation.json',
        values: {},
      },
      number: {
        id: 'components.Input.error.validation.max',
        defaultMessage: 'components.Input.error.validation.max',
        values: { max: 5 },
      },
    });
  });

  test('can extract errors from dynamic zones errors', () => {
    const dynamicZoneErrors = {
      errors: ['components.Input.error.validation.max'],
      message: 'components.Input.error.validation.max',
      name: 'ValidationError',
      value: {
        dynamicZone: [
          {
            __component: 'component',
            number: 6,
          },
        ],
      },
      inner: [
        {
          errors: ['components.Input.error.validation.max'],
          message: 'components.Input.error.validation.max',
          name: 'ValidationError',
          params: { value: 6, originalValue: 6, path: 'dynamicZone[0].number', max: 5 },
          path: 'dynamicZone[0].number',
          type: 'max',
          value: 6,
          inner: [],
        },
      ],
    } satisfies ValidationError;

    expect(getYupInnerErrors(dynamicZoneErrors)).toMatchObject({
      'dynamicZone.0.number': {
        id: 'components.Input.error.validation.max',
        defaultMessage: 'components.Input.error.validation.max',
        values: { max: 5 },
      },
    });
  });
});
