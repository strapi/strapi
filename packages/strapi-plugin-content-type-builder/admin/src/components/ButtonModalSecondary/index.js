/**
*
* ButtonModalSecondary
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Button } from 'reactstrap';

import styles from './styles.scss';

function ButtonModalSecondary({ message, onClick, type }) {
  return (
    <Button
      className={styles.buttonModalSecondary}
      onClick={onClick}
      type={type}
    >
      <FormattedMessage id={message} />
    </Button>
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

export default ButtonModalSecondary;
