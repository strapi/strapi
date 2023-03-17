import { AxiosError } from 'axios';

import { formatAxiosError } from '..';

describe('formatAxiosError', () => {
  test('serializes AxiosError', () => {
    const spy = jest.fn((obj) => obj);
    const error = new AxiosError(
      'Error message',
      '409',
      undefined,
      {},
      {
        status: 405,
        data: { message: 'Error message' },
      }
    );

    formatAxiosError(error, { formatMessage: spy });

    expect(spy).toHaveBeenCalledWith({
      defaultMessage: 'Error message',
      id: 'apiError.Error message',
      values: {
        code: '409',
      },
    });
  });
});
