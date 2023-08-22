import * as React from 'react';

/**
 * Set a given ref to a given value
 * This utility takes care of different types of refs: callback refs and RefObject(s)
 */
function setRef(ref, value) {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref !== null && ref !== undefined) {
    ref.current = value;
  }
}

/**
 * A utility to compose multiple refs together
 * Accepts callback refs and RefObject(s)
 */
function composeRefs(...refs) {
  return (node) => refs.forEach((ref) => setRef(ref, node));
}

/**
 * Takes multiple React like refs either React.Ref or a callback:
 * (node: T) => void and returns a single function that can be
 * passed to a React component as a ref.
 *
 * Example:
 * ```tsx
 * import { useComposedRefs } from '../hooks/useComposedRefs';
 *
 * const Component = React.forwardRef<HTMLInputElement, ComponentProps>((props, forwardedRef) => {
 *  const ref = useComposedRefs(internalRef, forwardedRef);
 *
 *  React.useEffect(() => {
 *   ref.current.focus();
 *  }, [ref]);
 *
 *  return <input ref={ref} />
 * }
 * ```
 */
function useComposedRefs(...refs) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useCallback(composeRefs(...refs), refs);
}

export { composeRefs, useComposedRefs };
