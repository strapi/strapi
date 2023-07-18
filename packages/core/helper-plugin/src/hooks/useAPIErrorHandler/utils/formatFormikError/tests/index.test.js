import { formatFormikError } from '..';

const API_VALIDATION_ERROR_FIXTURE = {
  response: {
    data: {
      error: {
        name: 'ValidationError',
        message: 'Main error',
        details: {
          errors: [
            {
              path: ['field', '0', 'name'],
              message: 'Field contains errors',
            },

            {
              path: ['field_other'],
              message: 'Field must be unique',
            },
          ],
        },
      },
    },
  },
};

const formatMessage = jest.fn((t) => t.defaultMessage);

describe('formatFormikError', () => {
  test('Transforms an error response into an FormikError object', () => {
    expect(
      formatFormikError(API_VALIDATION_ERROR_FIXTURE, {
        formatMessage,
        getTrad: (translation) => translation,
      })
    ).toStrictEqual({
      field: [
        {
          name: 'Field contains errors',
        },
      ],

      field_other: 'Field must be unique',
    });
  });

  test('In no details object was passed, return null', () => {
    expect(
      formatFormikError(
        {
          ...API_VALIDATION_ERROR_FIXTURE,
          response: {
            ...API_VALIDATION_ERROR_FIXTURE,
            data: {
              ...API_VALIDATION_ERROR_FIXTURE.response.data,
              error: {
                ...API_VALIDATION_ERROR_FIXTURE.response.data.error,
                details: undefined,
              },
            },
          },
        },
        {
          formatMessage,
          getTrad: (translation) => translation,
        }
      )
    ).toStrictEqual(null);
  });

  test('Fields without a path are not included', () => {
    expect(
      formatFormikError(
        {
          ...API_VALIDATION_ERROR_FIXTURE,
          response: {
            ...API_VALIDATION_ERROR_FIXTURE,
            data: {
              ...API_VALIDATION_ERROR_FIXTURE.response.data,
              error: {
                ...API_VALIDATION_ERROR_FIXTURE.response.data.error,
                details: {
                  errors: [
                    {
                      path: ['field', '0', 'name'],
                      message: 'Field contains errors',
                    },

                    {
                      message: 'Field must be unique',
                    },
                  ],
                },
              },
            },
          },
        },
        {
          formatMessage,
          getTrad: (translation) => translation,
        }
      )
    ).toStrictEqual({
      field: [{ name: 'Field contains errors' }],
    });
  });
});
