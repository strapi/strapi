/**
 * @typedef PossibleRef<T>
 * @type {React.Ref<T> | undefined;}
 *
 * @typedef setRef
 * @type {<T>(ref: PossibleRef<T>, value: T) => React.RefCallback<T>}
 */

/**
 * @type {setRef}
 */
const setRef = (ref, value) => {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref !== null && ref !== undefined) {
    ref.current = value;
  }
};

/**
 * A utility to compose multiple refs together
 * Accepts callback refs and RefObject(s)
 *
 * @type {<T>(...refs: PossibleRef<T>[]) => (node: T) => void}
 */
export const composeRefs = (...refs) => {
  return (node) => refs.forEach((ref) => setRef(ref, node));
};
