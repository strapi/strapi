import PropTypes from 'prop-types';
import React from 'react';

import { Stack } from '@strapi/design-system/Stack';
import { Flex } from '@strapi/design-system/Flex';
import { Box } from '@strapi/design-system/Box';

export const Relation = ({
  children,
  loadMore,
  search,
  totalNumberOfRelations,
  size,
  ...props
}) => {
  return (
    <>
      <Flex
        paddingBottom={totalNumberOfRelations > 0 ? 3 : 0}
        gap={2}
        justifyContent="space-between"
        alignItems="end"
        wrap="wrap"
      >
        <Stack basis={size <= 6 ? '100%' : '70%'} spacing={1} {...props}>
          {search}
        </Stack>
        <Flex>{loadMore}</Flex>
      </Flex>
      <Box>{children}</Box>
    </>
  );
};

Relation.defaultProps = {
  search: undefined,
  loadMore: undefined,
  totalNumberOfRelations: 0,
};

Relation.propTypes = {
  children: PropTypes.node.isRequired,
  search: PropTypes.node,
  loadMore: PropTypes.node,
  size: PropTypes.number.isRequired,
  totalNumberOfRelations: PropTypes.number,
};
