import { AxiosError } from 'axios';

import { formatAxiosError } from '..';

describe('formatAxiosError', () => {
  test('serializes AxiosError', () => {
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

    expect(formatAxiosError(error, { formatMessage: (obj) => obj })).toStrictEqual({
      defaultMessage: 'Error message',
      id: 'apiError.Error message',
      values: {
        code: '409',
      },
    });
  });
});
