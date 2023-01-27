import { renderHook } from '@testing-library/react-hooks';
import { axiosInstance } from '../../../core/utils';
import useRegenerate from '../index';

jest.spyOn(axiosInstance, 'get').mockResolvedValue({
  data: {
    data: {
      accessKey: 'this is my new access key',
    },
  },
});

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
}));

describe('useRegenerate', () => {
  it('returns a function to regenerate the data and a boolean', () => {
    const { result } = renderHook(() => useRegenerate(1, (accessKey) => accessKey));

    expect(result.current).toEqual({
      regenerateData: expect.any(Function),
      isLoadingConfirmation: false,
    });
  });
});
