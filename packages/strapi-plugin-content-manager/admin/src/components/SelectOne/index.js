import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { get, isNull } from 'lodash';

import Select from 'react-select';

function SelectOne({
  mainField,
  name,
  isDisabled,
  isLoading,
  onChange,
  onInputChange,
  onMenuClose,
  onMenuScrollToBottom,
  options,
  placeholder,
  styles,
  value,
}) {
  return (
    <Select
      id={name}
      isClearable
      isDisabled={isDisabled}
      isLoading={isLoading}
      options={options}
      onChange={onChange}
      onInputChange={onInputChange}
      onMenuClose={onMenuClose}
      onMenuScrollToBottom={onMenuScrollToBottom}
      placeholder={placeholder}
      styles={styles}
      value={isNull(value) ? null : { label: get(value, [mainField], ''), value }}
    />
  );
}

SelectOne.defaultProps = {
  value: null,
};

SelectOne.propTypes = {
  isDisabled: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  mainField: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onMenuClose: PropTypes.func.isRequired,
  onMenuScrollToBottom: PropTypes.func.isRequired,
  options: PropTypes.array.isRequired,
  placeholder: PropTypes.node.isRequired,
  styles: PropTypes.object.isRequired,
  value: PropTypes.object,
};

export default memo(SelectOne);
