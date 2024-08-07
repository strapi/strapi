import * as React from 'react';
import type { Data } from '@strapi/types';

let id = 0;

const genId = () => ++id;

const useId = (initialId: Data.ID) => {
  const idRef = React.useRef(`${initialId}-${genId()}`);

  return idRef.current;
};

export default useId;
