import { renderHook } from '@testing-library/react';

import { SPRING_LOAD_DELAY_MS, useSpringLoadedExpand } from '../useSpringLoadedExpand';

describe('useSpringLoadedExpand', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fires onExpand after the spring-load delay when hovering a collapsed branch', () => {
    const onExpand = jest.fn();

    const { rerender } = renderHook(
      (props: { isOver: boolean; canExpand: boolean }) =>
        useSpringLoadedExpand({ ...props, onExpand }),
      { initialProps: { isOver: true, canExpand: true } }
    );

    expect(onExpand).not.toHaveBeenCalled();

    jest.advanceTimersByTime(SPRING_LOAD_DELAY_MS);

    expect(onExpand).toHaveBeenCalledTimes(1);

    rerender({ isOver: false, canExpand: true });

    jest.advanceTimersByTime(SPRING_LOAD_DELAY_MS);

    expect(onExpand).toHaveBeenCalledTimes(1);
  });

  it('does not fire when the pointer leaves before the delay', () => {
    const onExpand = jest.fn();

    const { rerender } = renderHook(
      (props: { isOver: boolean; canExpand: boolean }) =>
        useSpringLoadedExpand({ ...props, onExpand }),
      { initialProps: { isOver: true, canExpand: true } }
    );

    jest.advanceTimersByTime(SPRING_LOAD_DELAY_MS - 1);

    rerender({ isOver: false, canExpand: true });

    jest.advanceTimersByTime(SPRING_LOAD_DELAY_MS);

    expect(onExpand).not.toHaveBeenCalled();
  });

  it('is a no-op when expansion is not allowed', () => {
    const onExpand = jest.fn();

    renderHook(() => useSpringLoadedExpand({ isOver: true, canExpand: false, onExpand }));

    jest.advanceTimersByTime(SPRING_LOAD_DELAY_MS);

    expect(onExpand).not.toHaveBeenCalled();
  });
});
