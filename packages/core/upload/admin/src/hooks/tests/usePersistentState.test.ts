import { renderHook, act } from '@testing-library/react';

import { usePersistentState } from '../usePersistentState';

describe('usePersistentState', () => {
  it('should return the value passed to set in the local storage', async () => {
    const { result } = renderHook(() => usePersistentState('key', 0));
    const [value, setValue] = result.current;
    expect(value).toBe(0);

    act(() => {
      setValue(1);
    });
    const [updatedValue] = result.current;
    expect(updatedValue).toBe(1);
  });
});
