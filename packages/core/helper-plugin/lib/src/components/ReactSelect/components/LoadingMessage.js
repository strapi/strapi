import React from 'react';

import { Flex } from '@strapi/design-system/Flex';
import { Loader } from '@strapi/design-system/Loader';

const LoadingMessage = (props) => {
  return (
    <Flex padding={1} justifyContent="center">
      <Loader small {...props} />
    </Flex>
  );
};

export default LoadingMessage;
