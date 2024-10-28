import * as React from 'react';

let id = 0;

const genId = () => ++id;

export const useId = (initialId: string) => {
  const idRef = React.useRef(`${initialId}-${genId()}`);

  return idRef.current;
};
