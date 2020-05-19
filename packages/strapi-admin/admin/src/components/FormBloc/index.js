import React from 'react';
import { Padded } from '@buffetjs/core';
import { LoadingIndicator, Row } from 'strapi-helper-plugin';
import PropTypes from 'prop-types';
import BaselineAlignement from '../BaselineAlignement';
import Bloc from '../Bloc';

const FormBloc = ({ children, isLoading }) => (
  <Bloc>
    <BaselineAlignement top size="22px" />
    <Padded left right size="sm">
      {isLoading ? (
        <>
          <LoadingIndicator />
          <BaselineAlignement bottom size="22px" />
        </>
      ) : (
        <Row>{children}</Row>
      )}
    </Padded>
  </Bloc>
);

FormBloc.defaultProps = {
  isLoading: false,
};

FormBloc.propTypes = {
  children: PropTypes.node.isRequired,
  isLoading: PropTypes.bool,
};

export default FormBloc;
