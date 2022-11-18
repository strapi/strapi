import PropTypes from 'prop-types';
import React from 'react';

import { Stack, Flex } from '@strapi/design-system';

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

        {loadMore}
      </Flex>

      {children}
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
