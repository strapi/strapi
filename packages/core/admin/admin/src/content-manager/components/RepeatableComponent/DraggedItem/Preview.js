import React from 'react';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';

const Preview = () => {
  return (
    <Box padding={6}>
      <Box background="primary600" paddingTop={2}>
        <Row />
      </Box>
    </Box>
  );
};

export default Preview;
