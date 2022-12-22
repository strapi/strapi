import normalizeAPIError from '../';

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
        message: 'Application crashed',
      },
    },
  },
};

describe('normalizeAPIError', () => {
  test('Handle ValidationError', () => {
    expect(normalizeAPIError(API_VALIDATION_ERROR_FIXTURE)).toStrictEqual({
      name: 'ValidationError',
      errors: {
        field: {
          defaultMessage: 'Field must be unique',
          id: 'apiError.Field must be unique',
          values: {
            field: 'field',
          },
        },

        'field.0.name': {
          defaultMessage: 'Field contains errors',
          id: 'apiError.Field contains errors',
          values: {
            field: 'name',
          },
        },
      },
    });
  });

  test('Handle ValidationError with custom prefix function', () => {
    const prefixFunction = (id) => `custom.${id}`;

    expect(normalizeAPIError(API_VALIDATION_ERROR_FIXTURE, prefixFunction)).toStrictEqual({
      name: 'ValidationError',
      errors: {
        field: {
          defaultMessage: 'Field must be unique',
          id: 'custom.apiError.Field must be unique',
          values: {
            field: 'field',
          },
        },

        'field.0.name': {
          defaultMessage: 'Field contains errors',
          id: 'custom.apiError.Field contains errors',
          values: {
            field: 'name',
          },
        },
      },
    });
  });

  test('Handle ApplicationError', () => {
    expect(normalizeAPIError(API_APPLICATION_ERROR_FIXTURE)).toStrictEqual({
      name: 'ApplicationError',
      defaultMessage: 'Application crashed',
      id: 'apiError.Application crashed',
    });
  });

  test('Handle ApplicationError with custom prefix function', () => {
    const prefixFunction = (id) => `custom.${id}`;

    expect(normalizeAPIError(API_APPLICATION_ERROR_FIXTURE, prefixFunction)).toStrictEqual({
      name: 'ApplicationError',
      defaultMessage: 'Application crashed',
      id: 'custom.apiError.Application crashed',
    });
  });
});
