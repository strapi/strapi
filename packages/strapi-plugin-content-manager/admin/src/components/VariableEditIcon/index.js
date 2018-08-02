/**
 * 
 * VariableEditIcon
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import styles from './styles.scss';

function VariableEditIcon({ onClick, withLongerHeight, ...rest }) {
  return (
    <span
      className={cn(withLongerHeight ? styles.editIconLonger : styles.editIcon)}
      onClick={onClick}
      {...rest}
    />
  );
}

VariableEditIcon.defaultProps = {
  onClick: () => {},
  withLongerHeight: false,
};

VariableEditIcon.propTypes = {
  onClick: PropTypes.func,
  withLongerHeight: PropTypes.bool,
};

export default VariableEditIcon;