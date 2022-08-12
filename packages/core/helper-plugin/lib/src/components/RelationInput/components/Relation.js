import PropTypes from 'prop-types';
import React from 'react';

import { Stack } from '@strapi/design-system/Stack';
import { Flex } from '@strapi/design-system/Flex';

export const Relation = ({ children, loadMore, search, ...props }) => {
  return (
    <Stack spacing={3}>
      <Flex justifyContent="space-between" alignItems="end">
        <Stack width="55%" spacing={1} {...props}>
          {search}
        </Stack>
        {loadMore}
      </Flex>

      {children}
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
