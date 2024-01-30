import { MutableRefObject, Ref } from 'react';

type PossibleRef<T> = Ref<T> | undefined;

const setRef = <T>(ref: PossibleRef<T>, value: T) => {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref !== null && ref !== undefined) {
    (ref as MutableRefObject<T>).current = value;
  }
};

/**
 * A utility to compose multiple refs together
 * Accepts callback refs and RefObject(s)
 */
export const composeRefs = <T>(...refs: PossibleRef<T>[]) => {
  return (node: T) => refs.forEach((ref) => setRef(ref, node));
};
