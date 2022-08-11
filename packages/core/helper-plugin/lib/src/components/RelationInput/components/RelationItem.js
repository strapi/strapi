import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';

const TypographyWrapper = styled(Typography)`
  width: 100%;
`;

const ChildrenWrapper = styled(Flex)`
  > a {
    color: currentColor;
    text-decoration: none;
  }
`;

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
      <TypographyWrapper textColor="primary600" as="div">
        <ChildrenWrapper width="100%" justifyContent="space-between" color="currentColor">
          {children}
        </ChildrenWrapper>
      </TypographyWrapper>
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
