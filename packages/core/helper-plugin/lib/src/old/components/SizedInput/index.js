import React from 'react';
import { Col } from 'reactstrap';
import PropTypes from 'prop-types';
import IntlInput from '../IntlInput';

const SizedInput = ({ size, ...rest }) => {
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
};

SizedInput.propTypes = {
  size: PropTypes.object,
};

export default SizedInput;
