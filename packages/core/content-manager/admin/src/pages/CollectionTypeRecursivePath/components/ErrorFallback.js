import React from 'react';
import { AnErrorOccurred } from '@strapi/helper-plugin';
import { Box } from '@strapi/design-system/Box';

const ErrorFallback = () => {
  return (
    <Box padding={8}>
      <AnErrorOccurred />
    </Box>
  );
};

export default ErrorFallback;
