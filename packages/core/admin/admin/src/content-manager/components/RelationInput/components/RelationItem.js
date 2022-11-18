import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';

const ChildrenWrapper = styled(Flex)`
  width: 100%;
  /* Used to prevent endAction to be pushed out of container */
  min-width: 0;
`;

export const RelationItem = ({ children, disabled, endAction, style, ...props }) => {
  return (
    <Box style={style} as="li">
      <Flex
        paddingTop={2}
        paddingBottom={2}
        paddingLeft={4}
        paddingRight={4}
        hasRadius
        borderSize={1}
        background={disabled ? 'neutral150' : 'neutral0'}
        borderColor="neutral200"
        justifyContent="space-between"
        {...props}
      >
        <ChildrenWrapper justifyContent="space-between">{children}</ChildrenWrapper>
        {endAction && <Box paddingLeft={4}>{endAction}</Box>}
      </Flex>
    </Box>
  );
};

RelationItem.defaultProps = {
  disabled: false,
  endAction: undefined,
  style: undefined,
};

RelationItem.propTypes = {
  children: PropTypes.node.isRequired,
  disabled: PropTypes.bool,
  endAction: PropTypes.node,
  style: PropTypes.shape({
    height: PropTypes.number,
    left: PropTypes.number,
    position: PropTypes.string,
    right: PropTypes.number,
    width: PropTypes.string,
  }),
};
