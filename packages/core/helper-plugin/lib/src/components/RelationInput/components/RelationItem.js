import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';

const TypographyWrapper = styled(Typography)`
  width: 100%;
  // Used to prevent endAction to be pushed out of container
  min-width: 0;
`;

const ChildrenWrapper = styled(Flex)`
  div > a {
    color: currentColor;
    text-decoration: none;
  }
`;

export const RelationItem = ({ children, disabled, endAction, ...props }) => {
  return (
    <Flex
      paddingTop={3}
      paddingBottom={3}
      paddingLeft={4}
      paddingRight={4}
      hasRadius
      borderSize={1}
      background={disabled ? 'neutral150' : 'neutral0'}
      borderColor="neutral200"
      justifyContent="space-between"
      as="li"
      {...props}
    >
      <TypographyWrapper textColor={disabled ? 'neutral600' : 'primary600'} as="div">
        <ChildrenWrapper justifyContent="space-between" color="currentColor">
          {children}
        </ChildrenWrapper>
      </TypographyWrapper>
      {endAction && <Box paddingLeft={4}>{endAction}</Box>}
    </Flex>
  );
};

RelationItem.defaultProps = {
  disabled: false,
  endAction: undefined,
};

RelationItem.propTypes = {
  children: PropTypes.node.isRequired,
  disabled: PropTypes.bool,
  endAction: PropTypes.node,
};
