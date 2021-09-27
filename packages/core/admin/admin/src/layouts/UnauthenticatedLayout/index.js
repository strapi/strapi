import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import LocaleToggle from './LocaleToggle';

const Wrapper = styled(Box)`
  margin: 0 auto;
  width: 552px;
`;

export const Column = styled(Row)`
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
      <Row as="header" justifyContent="flex-end">
        <Box paddingTop={6} paddingRight={8}>
          <LocaleToggle />
        </Box>
      </Row>
      <Box paddingTop={11} paddingBottom={11}>
        {children}
      </Box>
    </div>
  );
};

UnauthenticatedLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default UnauthenticatedLayout;
