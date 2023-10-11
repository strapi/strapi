import { AxiosError, AxiosHeaders } from 'axios';

import { getAPIInnerErrors } from '../getAPIInnerErrors';

import type { ApiError } from '../../types';

const API_VALIDATION_ERROR_FIXTURE = new AxiosError<{ error: ApiError }>(
  undefined,
  undefined,
  undefined,
  undefined,
  {
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
    statusText: 'Validation',
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
);

const API_APPLICATION_ERROR_FIXTURE = new AxiosError<{ error: ApiError }>(
  undefined,
  undefined,
  undefined,
  undefined,
  {
    data: {
      error: {
        name: 'ApplicationError',
        message: 'Application crashed',
        details: {},
      },
    },
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
);

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
