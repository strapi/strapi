import { FetchError } from '@strapi/admin/strapi-admin';

import getAPIInnerErrors from '../getAPIInnerErrors';

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

describe('getAPIInnerError', () => {
  test('handles ValidationError errors', () => {
    expect(
      getAPIInnerErrors(API_VALIDATION_ERROR_FIXTURE, { getTrad: (translation) => translation })
    ).toMatchObject({
      'field.0.name': {
        id: 'apiError.Field contains errors',
      },
      field: {
        id: 'apiError.Field must be unique',
      },
    });
  });

  test('handles ApplicationError errors', () => {
    expect(
      getAPIInnerErrors(API_APPLICATION_ERROR_FIXTURE, { getTrad: (translation) => translation })
    ).toBe('Application crashed');
  });
});
