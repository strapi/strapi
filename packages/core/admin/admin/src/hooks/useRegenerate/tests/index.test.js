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

describe('useRegenerate', () => {
  it('returns a function to regenerate the data and a boolean', () => {
    const { result } = renderHook(() => useRegenerate('/test', 1, (accessKey) => accessKey));

    expect(result.current).toEqual({
      regenerateData: expect.any(Function),
      isLoadingConfirmation: false,
    });
  });
});
