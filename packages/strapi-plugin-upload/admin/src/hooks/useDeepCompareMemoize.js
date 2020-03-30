import { useRef } from 'react';
import { isEqual } from 'lodash';

// Adapted from https://github.com/sandiiarov/use-deep-compare/blob/master/src/useDeepCompareMemoize.ts
const useDeepCompareMemoize = value => {
  const ref = useRef();

  if (!isEqual(value, ref.current)) {
    ref.current = value;
  }

  return ref.current;
};

export default useDeepCompareMemoize;
