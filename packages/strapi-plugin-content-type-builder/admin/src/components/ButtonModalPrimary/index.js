/**
 *
 * ButtonModalPrimary
 *
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import StyledButtonModalPrimary from './StyledButtonModalPrimary';

function ButtonModalPrimary({ add, message, onClick, type }) {
  const icon = add ? <i className={`fa fa-plus`} /> : null;

  return (
    <StyledButtonModalPrimary onClick={onClick} type={type}>
      {icon}
      <FormattedMessage id={message} />
    </StyledButtonModalPrimary>
  );
}

ButtonModalPrimary.defaultProps = {
  add: false,
  message: 'app.utils.defaultMessage',
  onClick: () => {},
  type: 'button',
};

ButtonModalPrimary.propTypes = {
  add: PropTypes.bool,
  message: PropTypes.string,
  onClick: PropTypes.func,
  type: PropTypes.string,
};

export default memo(ButtonModalPrimary);
export { ButtonModalPrimary };
