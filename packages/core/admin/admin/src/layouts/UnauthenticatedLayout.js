import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Box, Row } from '@strapi/parts';
import LocaleToggle from '../components/LocaleToggle';

const Wrapper = styled(Box)`
  margin: 0 auto;
  width: 552px;
`;

export const Column = styled(Row)`
  flex-direction: column;
`;

const UnauthenticatedLayout = ({ children }) => {
  return (
    <div>
      <Row justifyContent="flex-end">
        <Box paddingTop={6} paddingRight={8}>
          <LocaleToggle isLogged />
        </Box>
      </Row>
      <Box paddingTop="11" paddingBottom="11">
        <Wrapper
          shadow="tableShadow"
          hasRadius
          padding="10"
          background="neutral0"
          justifyContent="center"
        >
          {children}
        </Wrapper>
      </Box>
    </div>
  );
};

UnauthenticatedLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default UnauthenticatedLayout;
