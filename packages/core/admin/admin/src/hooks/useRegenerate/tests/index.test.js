import React from 'react';
import { IntlProvider } from 'react-intl';
import { renderHook } from '@testing-library/react-hooks';
import useRegenerate from '../index';

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
// eslint-disable-next-line react/prop-types
function RegenerateWrapper({ children }) {
  return (
    <IntlProvider messages={{}} locale="en">
      {children}
    </IntlProvider>
  );
}

describe('useRegenerate', () => {
  it('returns a function to regenerate the data and a boolean', () => {
    const { result } = renderHook(() => useRegenerate('/test', 1, (accessKey) => accessKey), {
      wrapper: RegenerateWrapper,
    });

    expect(result.current).toEqual({
      regenerateData: expect.any(Function),
      isLoadingConfirmation: false,
    });
  });
});
