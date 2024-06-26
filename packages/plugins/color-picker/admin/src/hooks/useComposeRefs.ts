import * as React from 'react';

type PossibleRef<T> = React.Ref<T> | undefined;

/**
 * Set a given ref to a given value
 * This utility takes care of different types of refs: callback refs and RefObject(s)
 */
function setRef<T>(ref: PossibleRef<T>, value: T) {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref !== null && ref !== undefined) {
    (ref as React.MutableRefObject<T>).current = value;
  }
}

/**
 * A utility to compose multiple refs together
 * Accepts callback refs and RefObject(s)
 */
function composeRefs<T>(...refs: PossibleRef<T>[]) {
  return (node: T) => refs.forEach((ref) => setRef(ref, node));
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
function useComposedRefs<T>(...refs: PossibleRef<T>[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useCallback(composeRefs(...refs), refs);
}

export { composeRefs, useComposedRefs };
