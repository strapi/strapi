/* eslint-disable check-file/filename-naming-convention */

import { renderHook } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { useRegenerate } from '../useRegenerate';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useFetchClient: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({
      data: {
        data: {
          accessKey: 'this is my new access key',
        },
      },
    }),
  }),
}));

describe('useRegenerate', () => {
  it('returns a function to regenerate the data and a boolean', () => {
    const { result } = renderHook(() => useRegenerate('/test', 1, (accessKey) => accessKey), {
      wrapper({ children }) {
        return (
          <IntlProvider messages={{}} locale="en">
            {children}
          </IntlProvider>
        );
      },
    });

    expect(result.current).toEqual({
      regenerateData: expect.any(Function),
      isLoadingConfirmation: false,
    });
  });
});
