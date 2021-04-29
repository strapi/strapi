import React from 'react';
import { Flex, Padded, Text } from '@buffetjs/core';
import { useIntl } from 'react-intl';
import { BaselineAlignment, useQuery } from 'strapi-helper-plugin';

const EmptyRole = () => {
  const { formatMessage } = useIntl();
  const query = useQuery();
  const search = query.get('_q');

  return (
    <>
      <BaselineAlignment top size="2px" />
      <Padded top bottom size="md">
        <Flex justifyContent="center">
          <Text fontSize="lg" fontWeight="bold">
            {formatMessage(
              {
                id: 'Roles.components.List.empty.withSearch',
                defaultMessage: 'There is no role corresponding to the search ({search})...',
              },
              { search }
            )}
          </Text>
        </Flex>
      </Padded>
    </>
  );
};

export default EmptyRole;
