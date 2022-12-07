import { useEffect, useRef } from 'react';

/**
 * @type {<T>(value: T) => T | undefined}
 */
export const usePrev = (value) => {
  const ref = useRef();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
};
