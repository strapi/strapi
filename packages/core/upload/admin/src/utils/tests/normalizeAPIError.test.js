import { FetchError } from '@strapi/admin/strapi-admin';

import { normalizeAPIError } from '../normalizeAPIError';

const API_VALIDATION_ERROR_FIXTURE = new FetchError('ValidationError', {
  data: {
    error: {
      name: 'ValidationError',
      message: 'errors',
      details: {
        errors: [
          {
            path: ['field', '0', 'name'],
            message: 'Field contains errors',
            name: 'ValidationError',
          },

          {
            path: ['field'],
            message: 'Field must be unique',
            name: 'ValidationError',
          },
        ],
      },
    },
  },
  status: 422,
});

const API_APPLICATION_ERROR_FIXTURE = new FetchError('ApplicationError', {
  data: {
    error: {
      name: 'ApplicationError',
      message: 'Application crashed',
      details: {},
    },
  },
  status: 400,
});

describe('normalizeAPIError', () => {
  test('Handle ValidationError', () => {
    expect(normalizeAPIError(API_VALIDATION_ERROR_FIXTURE)).toStrictEqual({
      name: 'ValidationError',
      message: 'errors',
      errors: [
        {
          id: 'apiError.Field contains errors',
          defaultMessage: 'Field contains errors',
          name: 'ValidationError',
          values: {
            path: 'field.0.name',
          },
        },

        {
          id: 'apiError.Field must be unique',
          defaultMessage: 'Field must be unique',
          name: 'ValidationError',
          values: {
            path: 'field',
          },
        },
      ],
    });
  });

  test('Handle ValidationError with custom prefix function', () => {
    const prefixFunction = (id) => `custom.${id}`;

    expect(normalizeAPIError(API_VALIDATION_ERROR_FIXTURE, prefixFunction)).toStrictEqual({
      name: 'ValidationError',
      message: 'errors',
      errors: [
        {
          name: 'ValidationError',
          defaultMessage: 'Field contains errors',
          id: 'custom.apiError.Field contains errors',
          values: {
            path: 'field.0.name',
          },
        },

        {
          name: 'ValidationError',
          defaultMessage: 'Field must be unique',
          id: 'custom.apiError.Field must be unique',
          values: {
            path: 'field',
          },
        },
      ],
    });
  });

  test('Handle ApplicationError', () => {
    expect(normalizeAPIError(API_APPLICATION_ERROR_FIXTURE)).toStrictEqual({
      name: 'ApplicationError',
      defaultMessage: 'Application crashed',
      id: 'apiError.Application crashed',
      values: {},
    });
  });

  test('Handle ApplicationError with custom prefix function', () => {
    const prefixFunction = (id) => `custom.${id}`;

    expect(normalizeAPIError(API_APPLICATION_ERROR_FIXTURE, prefixFunction)).toStrictEqual({
      name: 'ApplicationError',
      defaultMessage: 'Application crashed',
      id: 'custom.apiError.Application crashed',
      values: {},
    });
  });
});
