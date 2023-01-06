import { getAPIInnerError } from '../getAPIInnerError';

const API_ERROR_FIXTURE = {
  response: {
    data: {
      error: {
        details: {
          errors: [
            {
              path: ['field', '0', 'name'],
              message: 'Field contains errors',
            },

            {
              path: ['field'],
              message: 'Field must be unique',
            },
          ],
        },
      },
    },
  },
};

describe('getAPIInnerError', () => {
  test('transforms API errors into errors, which can be rendered by the CM', () => {
    expect(getAPIInnerError(API_ERROR_FIXTURE)).toMatchObject({
      'field.0.name': {
        id: 'content-manager.apiError.Field contains errors',
      },
      field: {
        id: 'content-manager.apiError.Field must be unique',
      },
    });
  });
});
