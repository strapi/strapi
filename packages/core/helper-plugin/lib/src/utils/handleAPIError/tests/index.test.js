import handleAPIError from '../index';

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

describe('getAPIInnerError', () => {
  test('handles ValidationError errors', () => {
    expect(
      handleAPIError(API_VALIDATION_ERROR_FIXTURE, '', {
        getTrad: (translation) => `plugin.${translation}`,
      })
    ).toMatchObject({
      'field.0.name': {
        id: 'plugin.apiError.Field contains errors',
      },
      field: {
        id: 'plugin.apiError.Field must be unique',
      },
    });
  });

  test('handles ValidationError and applies a global translation prefix without getTrad', () => {
    expect(handleAPIError(API_VALIDATION_ERROR_FIXTURE)).toMatchObject({
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
      handleAPIError(
        {
          response: {
            data: {
              error: {
                name: 'ApplicationError',
                message: 'Error message',
              },
            },
          },
        },
        { getTrad: (translation) => translation }
      )
    ).toBe('Error message');
  });

  test('renders a fallback message, of the error did not return a message', () => {
    expect(
      handleAPIError(
        {
          response: {
            data: {
              error: {
                name: 'ApplicationError',
              },
            },
          },
        },
        'Fallback'
      )
    ).toBe('Fallback');
  });
});
