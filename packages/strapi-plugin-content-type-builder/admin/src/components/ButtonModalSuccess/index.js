/**
 *
 * ButtonModalSecondary
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import StyledButtonModalSuccess from './StyledButtonModalSuccess';

function ButtonModalSuccess({ message, onClick, type }) {
  return (
    <StyledButtonModalSuccess onClick={onClick} type={type}>
      <FormattedMessage id={message} />
    </StyledButtonModalSuccess>
  );
}

ButtonModalSuccess.defaultProps = {
  type: 'button',
};

ButtonModalSuccess.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.string,
};

export default ButtonModalSuccess;
