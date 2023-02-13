import { renderHook } from '@testing-library/react-hooks';
import { useFetchClient } from '@strapi/helper-plugin';
import { useQuery } from 'react-query';
import useLicenseLimits from '..';

jest.mock('@strapi/helper-plugin', () => ({
  useFetchClient: jest.fn(() => ({
    get: jest.fn(),
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
    expect(useQuery).toHaveBeenCalledWith(['ee', 'license-limit-info'], expect.any(Function));
    expect(result.current.license.data).toEqual(data.data);
  });
});
