import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Box, Flex } from '@strapi/design-system';
import LocaleToggle from './LocaleToggle';

const Wrapper = styled(Box)`
  margin: 0 auto;
  width: 552px;
`;

export const Column = styled(Flex)`
  flex-direction: column;
`;

export const LayoutContent = ({ children }) => (
  <Wrapper
    shadow="tableShadow"
    hasRadius
    paddingTop={9}
    paddingBottom={9}
    paddingLeft={10}
    paddingRight={10}
    background="neutral0"
    justifyContent="center"
  >
    {children}
  </Wrapper>
);
LayoutContent.propTypes = {
  children: PropTypes.node.isRequired,
};

const UnauthenticatedLayout = ({ children }) => {
  return (
    <div>
      <Flex as="header" justifyContent="flex-end">
        <Box paddingTop={6} paddingRight={8}>
          <LocaleToggle />
        </Box>
      </Flex>
      <Box paddingTop={2} paddingBottom={11}>
        {children}
      </Box>
    </div>
  );
};

UnauthenticatedLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default UnauthenticatedLayout;
