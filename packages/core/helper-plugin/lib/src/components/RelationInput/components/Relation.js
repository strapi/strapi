import React from 'react';
import PropTypes from 'prop-types';
import { Stack } from '@strapi/design-system/Stack';
import { Flex } from '@strapi/design-system/Flex';

export const Relation = ({ children, rightAction, leftAction, ...props }) => {
  return (
    <Stack spacing={3}>
      <Flex justifyContent="space-between" alignItems="end">
        <Stack width="55%" spacing={1} {...props}>
          {leftAction}
        </Stack>
        {rightAction}
      </Flex>
      {children}
    </Stack>
  );
};

Relation.defaultProps = {
  leftAction: undefined,
  rightAction: undefined,
};

Relation.propTypes = {
  children: PropTypes.node.isRequired,
  leftAction: PropTypes.node,
  rightAction: PropTypes.node,
};
