import React from 'react';
import { Remove } from '@buffetjs/icons';
import { components } from 'react-select';

const ClearIndicator = props => {
  const Component = components.ClearIndicator;

  return (
    <Component {...props}>
      <Remove width="11px" height="11px" fill="#9EA7B8" />
    </Component>
  );
};

export default ClearIndicator;
