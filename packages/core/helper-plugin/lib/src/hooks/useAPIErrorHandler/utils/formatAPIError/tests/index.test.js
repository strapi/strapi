import { formatAPIError } from '..';

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

const formatMessage = jest.fn((t) => t.defaultMessage);

describe('formatAPIError', () => {
  test('handles ValidationError', () => {
    expect(
      formatAPIError(API_VALIDATION_ERROR_FIXTURE, {
        formatMessage,
        getTrad: (translation) => `plugin.${translation}`,
      })
    ).toBe(`Field contains errors\nField must be unique`);
  });

  test('handles ValidationError and applies a global translation prefix without getTrad', () => {
    expect(formatAPIError(API_VALIDATION_ERROR_FIXTURE, { formatMessage })).toBe(
      `Field contains errors\nField must be unique`
    );
  });

  test('handles ApplicationError errors', () => {
    expect(
      formatAPIError(
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
        { formatMessage, getTrad: (translation) => translation }
      )
    ).toBe('Error message');
  });

  test('error if formatMessage was not passed', () => {
    expect(() => formatAPIError(API_VALIDATION_ERROR_FIXTURE)).toThrow();
  });
});
