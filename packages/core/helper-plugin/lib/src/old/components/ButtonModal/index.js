/**
 *
 * ButtonModalSecondary
 *
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import ButtonSecondary from './StyledButtonSecondary';
import ButtonSuccess from './StyledButtonSuccess';

function ButtonModal({ message, onClick, type, isSecondary }) {
  const Component = isSecondary ? ButtonSecondary : ButtonSuccess;

  return (
    <Component onClick={onClick} type={type}>
      <FormattedMessage id={message} />
    </Component>
  );
}

ButtonModal.defaultProps = {
  isSecondary: false,
  type: 'button',
};

ButtonModal.propTypes = {
  isSecondary: PropTypes.bool,
  message: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  type: PropTypes.string,
};

export default memo(ButtonModal);
export { ButtonModal };
