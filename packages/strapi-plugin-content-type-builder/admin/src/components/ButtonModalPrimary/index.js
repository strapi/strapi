/**
 *
 * ButtonModalPrimary
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Button } from 'reactstrap';

import styles from './styles.scss';

function ButtonModalPrimary({ add, message, onClick, type }) {
  /* istanbul ignore next */
  // Ignoring the style condition is intended...
  const className = add
    ? styles.buttonModalPrimaryAdd
    : styles.buttonModalPrimary;

  return (
    <Button className={className} onClick={onClick} type={type}>
      <FormattedMessage id={message} />
    </Button>
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

export default ButtonModalPrimary;
