import React from 'react';
import { Col } from 'reactstrap';
import PropTypes from 'prop-types';
import IntlInput from '../IntlInput';

// TODO: remove this component
const SizedInput = ({ size, noMargin, ...rest }) => {
  return (
    <Col {...size}>
      <IntlInput {...rest} />
    </Col>
  );
};

SizedInput.defaultProps = {
  size: {
    xs: '6',
  },
  noMargin: false,
};

SizedInput.propTypes = {
  size: PropTypes.object,
  noMargin: PropTypes.bool,
};

export default SizedInput;
