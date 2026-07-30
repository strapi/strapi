import { renderHook, waitFor } from '@testing-library/react';

import { usePersistentState, useScopedPersistentState } from '../usePersistentState';

jest.mock('../../services/admin', () => ({
  useInitQuery: jest.fn(() => ({
    data: {
      uuid: 'test-uuid',
    },
  })),
}));

describe('usePersistentState', () => {
  it('should return the value passed to set in the local storage', async () => {
    const { result } = renderHook(() => usePersistentState('key', 0));
    const [value, setValue] = result.current;
    expect(value).toBe(0);

    await waitFor(() => {
      setValue(1);
    });
    const [updatedValue] = result.current;
    expect(updatedValue).toBe(1);
  });
});

describe('useScopedPersistentState', () => {
  it('should return the value passed to set in the local storage with a scoped key', async () => {
    const { result } = renderHook(() => useScopedPersistentState('key', 0));
    const [value, setValue] = result.current;
    expect(value).toBe(0);

    await waitFor(() => {
      setValue(1);
    });
    const [updatedValue] = result.current;
    expect(localStorage.getItem('key:test-uuid')).toBeDefined();
    expect(updatedValue).toBe(1);
  });
});
