import { renderHook, act } from '@testing-library/react';

import { useQueryParams } from '../useQueryParams';

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(() => ({
    search: '',
  })),
  useHistory: jest.fn(() => ({
    push: mockHistoryPush,
  })),
}));

describe('useQueryParams', () => {
  it('should set the query params using setQuery method', () => {
    const { result } = renderHook(() => useQueryParams());
    const [{ query }, setQuery] = result.current;
    expect(query).toBe(undefined); // no initial params

    act(() => {
      setQuery({ page: 1 });
    });
    expect(mockHistoryPush).toHaveBeenCalledWith({ search: 'page=1' });
  });
});
