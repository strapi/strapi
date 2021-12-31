import React from 'react';
import { pxToRem } from '@strapi/helper-plugin';
import { Box } from '@strapi/design-system/Box';

const StepLine = () => {
  return (
    <Box
      width={pxToRem(2)}
      minHeight={pxToRem(24)}
      height="100%"
      background="primary500"
      hasRadius
    />
  );
};

export default StepLine;
