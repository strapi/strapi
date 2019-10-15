/**
 *
 * ButtonModalSecondary
 *
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import StyledButtonModalSecondary from './StyledButtonModalSecondary';

function ButtonModalSecondary({ message, onClick, type }) {
  return (
    <StyledButtonModalSecondary onClick={onClick} type={type}>
      <FormattedMessage id={message} />
    </StyledButtonModalSecondary>
  );
}

ButtonModalSecondary.defaultProps = {
  type: 'button',
};

ButtonModalSecondary.propTypes = {
  message: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  type: PropTypes.string,
};

export default memo(ButtonModalSecondary);
export { ButtonModalSecondary };
