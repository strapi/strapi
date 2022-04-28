import { useRef } from 'react';

let id = 0;

const genId = () => ++id;

const useId = (prefix, initialId) => {
  const idRef = useRef(initialId || `${prefix}-${genId()}`);

  return idRef.current;
};

export default useId;
