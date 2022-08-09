import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';

export const RelationItem = ({ children, endAction, ...props }) => {
  return (
    <Flex
      paddingTop={3}
      paddingBottom={3}
      paddingLeft={4}
      paddingRight={4}
      hasRadius
      borderSize={1}
      borderColor="neutral200"
      justifyContent="space-between"
      as="li"
      {...props}
    >
      <Flex width="100%" justifyContent="space-between">
        {children}
      </Flex>
      {endAction && <Box paddingLeft={4}>{endAction}</Box>}
    </Flex>
  );
};

RelationItem.defaultProps = {
  endAction: undefined,
};

RelationItem.propTypes = {
  children: PropTypes.node.isRequired,
  endAction: PropTypes.node,
};
