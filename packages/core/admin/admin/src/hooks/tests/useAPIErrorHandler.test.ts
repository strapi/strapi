import { renderHook } from '@tests/utils';

import { FetchError } from '../../utils/getFetchClient';
import { useAPIErrorHandler } from '../useAPIErrorHandler';

describe('useAPIErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('exports formatAPIError()', async () => {
    const { result } = renderHook(() => useAPIErrorHandler());

    expect(typeof result.current.formatAPIError).toBe('function');
  });

  test('formats a single API error', async () => {
    const { result } = renderHook(() => useAPIErrorHandler());

    const message = result.current.formatAPIError(
      new FetchError('Error occured', {
        data: {
          error: {
            name: 'ApplicationError',
            message: 'Field contains errors',
            details: {},
          },
        },
      })
    );

    expect(message).toBe('Field contains errors');
  });

  test('formats an API error containing multiple errors', async () => {
    const { result } = renderHook(() => useAPIErrorHandler());

    const message = result.current.formatAPIError(
      new FetchError('Fetch Error Occured', {
        data: {
          error: {
            name: 'ValidationError',
            message: '',
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
      })
    );

    expect(message).toBe('Field contains errors\nField must be unique');
  });

  test('formats FetchErrors', async () => {
    const { result } = renderHook(() => useAPIErrorHandler());

    const fetchError = new FetchError('Error message', {
      // @ts-expect-error – we're testing that it can handle fetch errors
      data: { message: 'Error message' },
    });

    const message = result.current.formatAPIError(fetchError);

    expect(message).toBe('Error message');
  });
});
