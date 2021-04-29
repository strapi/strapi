import React from 'react';
import { Flex, Padded, Text } from '@buffetjs/core';
import { useIntl } from 'react-intl';

import BaselineAlignment from './BaselineAlignment';

const EmptyRole = () => {
  const { formatMessage } = useIntl();

  return (
    <>
      <BaselineAlignment />
      <Padded top bottom size="md">
        <Flex justifyContent="center">
          <Text fontSize="lg" fontWeight="bold">
            {formatMessage({
              id: 'Roles.components.List.empty',
              defaultMessage: 'There is no role',
            })}
          </Text>
        </Flex>
      </Padded>
    </>
  );
};

export default EmptyRole;
