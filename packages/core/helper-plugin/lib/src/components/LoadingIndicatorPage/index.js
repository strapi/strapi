import React from 'react';
import { Loader } from '@strapi/parts/Loader';
import { Row } from '@strapi/parts/Row';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const Wrapper = styled(Row)`
  height: 100vh;
`;

const LoadingIndicatorPage = ({ 'data-testid': dataTestId, children }) => {
  return (
    <Wrapper justifyContent="space-around" data-testid={dataTestId}>
      <Loader>{children}</Loader>
    </Wrapper>
  );
};

LoadingIndicatorPage.defaultProps = {
  'data-testid': 'loader',
  children: 'Loading content.',
};

LoadingIndicatorPage.propTypes = {
  'data-testid': PropTypes.string,
  children: PropTypes.string,
};

export default LoadingIndicatorPage;
