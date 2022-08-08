import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';

export const RelationItem = ({ relations, index, children, endAction, ...props }) => {
  return (
    <Box {...props}>
      <Flex
        paddingTop={3}
        paddingBottom={3}
        paddingLeft={4}
        paddingRight={4}
        hasRadius
        borderSize={1}
        borderColor="neutral200"
        justifyContent="space-between"
      >
        <Flex width="100%" justifyContent="space-between">
          {children}
        </Flex>
        {endAction && <Box paddingLeft={4}>{endAction}</Box>}
      </Flex>
    </Box>
  );
};

RelationItem.defaultProps = {
  relations: [],
  index: undefined,
  endAction: undefined,
};

RelationItem.propTypes = {
  relations: PropTypes.array,
  index: PropTypes.number,
  children: PropTypes.node.isRequired,
  endAction: PropTypes.node,
};
