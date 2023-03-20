import PropTypes from 'prop-types';
import React from 'react';

import { Flex } from '@strapi/design-system';

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
        <Flex
          direction="column"
          alignItems="stretch"
          basis={size <= 6 ? '100%' : '70%'}
          gap={1}
          {...props}
        >
          {search}
        </Flex>

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
