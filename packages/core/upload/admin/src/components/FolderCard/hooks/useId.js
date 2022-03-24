import { useRef } from 'react';

let id = 0;

const genId = () => ++id;

const useId = initialId => {
  const idRef = useRef(`${initialId}-${genId()}`);

  return idRef.current;
};

export default useId;
