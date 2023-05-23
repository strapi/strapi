import { renderHook } from '@testing-library/react-hooks';
import { useFetchClient } from '@strapi/helper-plugin';
import { useQuery } from 'react-query';
import useLicenseLimits from '..';

jest.mock('@strapi/helper-plugin', () => ({
  useFetchClient: jest.fn(() => ({
    get: jest.fn(),
  })),
  useRBAC: jest.fn(() => ({
    isLoading: false,
    allowedActions: {
      canRead: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
    },
  })),
}));

jest.mock('react-query', () => ({
  useQuery: jest.fn(),
}));

describe('useLicenseLimits', () => {
  it('should fetch the license limit information', async () => {
    const data = { data: { id: 1, name: 'Test License' } };
    useQuery.mockReturnValue({
      data: { id: 1, name: 'Test License' },
      isLoading: false,
    });

    const { result } = renderHook(() => useLicenseLimits());

    expect(useFetchClient).toHaveBeenCalled();
    expect(useQuery).toHaveBeenCalledWith(['ee', 'license-limit-info'], expect.any(Function), {
      enabled: true,
    });
    expect(result.current.license.data).toEqual(data.data);
  });

  it('data should be undefined if there is an API error', async () => {
    // const data = { data: { id: 1, name: 'Test License' } };
    useQuery.mockReturnValue({
      isError: true,
    });

    const { result } = renderHook(() => useLicenseLimits());

    expect(useFetchClient).toHaveBeenCalled();
    expect(useQuery).toHaveBeenCalledWith(['ee', 'license-limit-info'], expect.any(Function), {
      enabled: true,
    });
    expect(result.current.license.data).toEqual(undefined);
  });
});
