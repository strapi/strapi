/**
 *
 * CustomInputCheckbox
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Label } from './components';

function CustomInputCheckbox({
  entriesToDelete,
  isAll,
  name,
  onChange,
  value,
}) {
  const shouldDisplaySomeChecked =
    isAll && entriesToDelete.length > 0 && !value;

  const shouldDisplayAllChecked = isAll && value;

  return (
    <span className="form-check" styles={{ marginLeft: '-15px' }}>
      <Label
        className="form-check-label"
        isAll={isAll}
        shouldDisplaySomeChecked={shouldDisplaySomeChecked}
        shouldDisplayAllChecked={shouldDisplayAllChecked}
        isChecked={value && !isAll}
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
      </Label>
    </span>
  );
}

CustomInputCheckbox.defaultProps = {
  entriesToDelete: [],
  isAll: false,
  name: '',
  value: false,
};

CustomInputCheckbox.propTypes = {
  entriesToDelete: PropTypes.array,
  isAll: PropTypes.bool,
  name: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onChange: PropTypes.func.isRequired,
  value: PropTypes.bool,
};

export default memo(CustomInputCheckbox);
