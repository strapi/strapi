import React from 'react';
import { Loader } from '@strapi/parts/Loader';
import { Row } from '@strapi/parts/Row';
import PropTypes from 'prop-types';

const LoadingIndicatorPage = ({ 'data-testid': dataTestId, ...rest }) => {
  return (
    <Row justifyContent="space-around" data-testid={dataTestId}>
      <Loader>Loading content.</Loader>
    </Row>
  );
};

LoadingIndicatorPage.defaultProps = {
  'data-testid': 'loader',
};

LoadingIndicatorPage.propTypes = {
  'data-testid': PropTypes.string,
};

export default LoadingIndicatorPage;
