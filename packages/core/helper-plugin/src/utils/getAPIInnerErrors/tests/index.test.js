import getAPIInnerErrors from '../index';

const API_VALIDATION_ERROR_FIXTURE = {
  response: {
    data: {
      error: {
        name: 'ValidationError',
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

const API_APPLICATION_ERROR_FIXTURE = {
  response: {
    data: {
      error: {
        name: 'ApplicationError',
        message: 'Error message',
      },
    },
  },
};

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
    ).toBe('Error message');
  });
});
