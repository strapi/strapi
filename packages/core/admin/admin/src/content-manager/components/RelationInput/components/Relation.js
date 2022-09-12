import PropTypes from 'prop-types';
import React from 'react';

import { Stack } from '@strapi/design-system/Stack';
import { Flex } from '@strapi/design-system/Flex';
import { Box } from '@strapi/design-system/Box';

export const Relation = ({ children, loadMore, search, ...props }) => {
  return (
    <Stack
      spacing={3}
      paddingTop={4}
      paddingBottom={4}
      paddingLeft={6}
      paddingRight={6}
      hasRadius
      background="neutral100"
    >
      <Flex gap={2} justifyContent="space-between" alignItems="end" wrap="wrap">
        <Stack basis="70%" spacing={1} {...props}>
          {search}
        </Stack>
        <Flex>{loadMore}</Flex>
      </Flex>
      <Box>{children}</Box>
    </Stack>
  );
};

Relation.defaultProps = {
  search: undefined,
  loadMore: undefined,
};

Relation.propTypes = {
  children: PropTypes.node.isRequired,
  search: PropTypes.node,
  loadMore: PropTypes.node,
};
