/**
 *
 * CustomInputCheckbox
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import styles from './styles.scss';

function CustomInputCheckbox({ isAll, name, onChange, value }) {
  return (
    <span className={cn('form-check', styles.customSpan)}>
      <label
        className={cn(
          'form-check-label',
          styles.customLabel,
          isAll ? styles.customLabelHeader : styles.customLabelRow,
          value && isAll && styles.customLabelCheckedHeader,
          value && !isAll && styles.customLabelCheckedRow,
        )}
        htmlFor={name}
      >
        <input
          className="form-check-input"
          checked={value}
          id={name}
          name={name}
          onChange={onChange}
          type="checkbox"
        />
      </label>
    </span>
  );
}

CustomInputCheckbox.defaultProps = {
  isAll: false,
  name: '',
  value: false,
};

CustomInputCheckbox.propTypes = {
  isAll: PropTypes.bool,
  name: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]),
  onChange: PropTypes.func.isRequired,
  value: PropTypes.bool,
};

export default CustomInputCheckbox;
