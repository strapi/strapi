import React from 'react';

import { Cross } from '@strapi/icons';
import { components } from 'react-select';

import IconBox from './IconBox';

const ClearIndicator = (props) => {
  const Component = components.ClearIndicator;

  return (
    <Component {...props}>
      <IconBox as="button" type="button">
        <Cross />
      </IconBox>
    </Component>
  );
};

export default ClearIndicator;
