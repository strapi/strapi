import { renderHook } from '@testing-library/react-hooks';

import { usePrev } from '../usePrev';

describe('usePrev', () => {
  const setup = () => renderHook(({ state }) => usePrev(state), { initialProps: { state: 0 } });

  it('should return undefined on initial render', () => {
    const { result } = setup();

    expect(result.current).toBeUndefined();
  });

  it('should always return previous state after each update', () => {
    const { result, rerender } = setup();

    rerender({ state: 2 });
    expect(result.current).toBe(0);

    rerender({ state: 4 });
    expect(result.current).toBe(2);

    rerender({ state: 6 });
    expect(result.current).toBe(4);
  });
});
