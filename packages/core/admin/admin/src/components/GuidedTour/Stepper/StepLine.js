import React from 'react';
import { pxToRem } from '@strapi/helper-plugin';
import { Box } from '@strapi/design-system/Box';

const StepLine = (props) => {
  return (
    <Box
      width={pxToRem(2)}
      height="100%"
      background="primary500"
      hasRadius
      {...props}
    />
  );
};

export default StepLine;
