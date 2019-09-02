/**
 * 
 * InputCheckbox
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import styles from './styles.scss';

function InputCheckbox({ name, onChange, value }) {
  return (
    <div
      className={cn(styles.inputCheckboxCTM, 'col-md-12')}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <div className="form-check">
        <label
          className={cn('form-check-label', styles.inputCheckbockCTMLabel, value && styles.checked)}
          htmlFor={name}
        >
          <input
            className="form-check-input"
            defaultChecked={value}
            id={name}
            name={name}
            onChange={onChange}
            type="checkbox"
          />
          {name}
        </label>
      </div>
    </div>
  );
}

InputCheckbox.defaultProps = {
  onChange: () => {},
  value: false,
};

InputCheckbox.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  value: PropTypes.bool,
};

export default InputCheckbox;