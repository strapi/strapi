import { renderHook, act } from '@testing-library/react-hooks';
import { useIntl } from 'react-intl';
import { AxiosError } from 'axios';

import { useAPIErrorHandler } from '../useAPIErrorHandler';

jest.mock('react-intl', () => ({
  ...jest.requireActual('react-intl'),
  useIntl: jest.fn().mockReturnValue({
    formatMessage: jest.fn((obj) => obj.defaultMessage),
  }),
}));

function setup(...args) {
  return new Promise((resolve) => {
    act(() => {
      resolve(renderHook(() => useAPIErrorHandler(...args)));
    });
  });
}

describe('useAPIErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('exports formatAPIError()', async () => {
    const handler = await setup();

    expect(typeof handler.result.current.formatAPIError).toBe('function');
  });

  test('formats a single API error', async () => {
    let message;
    const handler = await setup();
    const { formatMessage } = useIntl();
    const { formatAPIError } = handler.result.current;

    act(() => {
      message = formatAPIError({
        response: {
          data: {
            error: {
              name: 'ApplicationError',
              message: 'Field contains errors',
            },
          },
        },
      });
    });

    expect(message).toBe('Field contains errors');
    expect(formatMessage).toBeCalledTimes(1);
  });

  test('formats an API error containing multiple errors', async () => {
    let message;
    const handler = await setup();
    const { formatMessage } = useIntl();
    const { formatAPIError } = handler.result.current;

    act(() => {
      message = formatAPIError({
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
      });
    });

    expect(message).toBe('Field contains errors\nField must be unique');
    expect(formatMessage).toBeCalledTimes(2);
  });

  test('formats AxiosErrors', async () => {
    let message;
    const handler = await setup();
    const { formatAPIError } = handler.result.current;

    const axiosError = new AxiosError(
      'Error message',
      '409',
      undefined,
      {},
      {
        status: 405,
        data: { message: 'Error message' },
      }
    );

    act(() => {
      message = formatAPIError(axiosError);
    });

    expect(message).toBe('Error message');
  });
});
