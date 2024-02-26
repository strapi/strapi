import { useMemo } from 'react';

import throttle from 'lodash/throttle';

type ThrottleSettings = Parameters<typeof throttle>[2];

/**
 * @internal
 * @description Create a throttled version of a callback
 * @example
 * ```tsx
 * // First create a callback using React’s `useCallback` hook
 * const myCallback = useCallback(() => {
 *   // this is not throttled
 * }, [])
 *
 * // Then make a throttled version using the `useThrottledCallback` hook
 * const myThrottledCallback = useThrottledCallback(myCallback, 100)
 *
 * // Call the throttled callback
 * <Button onClick={myThrottledCallback} />
 * ```
 */
const useThrottledCallback = <T extends (...args: any[]) => any>(
  callback: T,
  wait: number,
  options: ThrottleSettings
): T => {
  const throttledCallback = useMemo(
    () => throttle(callback, wait, options) as unknown as T,
    [callback, options, wait]
  );

  return throttledCallback;
};

export { useThrottledCallback };
