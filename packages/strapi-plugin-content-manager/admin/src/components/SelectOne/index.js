import React from 'react';
import PropTypes from 'prop-types';
import { get, isNull } from 'lodash';

import Select from 'react-select';

function SelectOne({
  mainField,
  name,
  isLoading,
  onChange,
  onInputChange,
  onMenuClose,
  onMenuScrollToBottom,
  options,
  placeholder,
  value,
}) {
  return (
    <Select
      id={name}
      isLoading={isLoading}
      isClearable
      options={options}
      onChange={onChange}
      onInputChange={onInputChange}
      onMenuClose={onMenuClose}
      onMenuScrollToBottom={onMenuScrollToBottom}
      placeholder={placeholder}
      value={
        isNull(value) ? null : { label: get(value, [mainField], ''), value }
      }
    />
  );
}

SelectOne.defaultProps = {
  value: null,
};

SelectOne.propTypes = {
  mainField: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  isLoading: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onMenuClose: PropTypes.func.isRequired,
  onMenuScrollToBottom: PropTypes.func.isRequired,
  options: PropTypes.array.isRequired,
  placeholder: PropTypes.node.isRequired,
  value: PropTypes.object,
};

export default SelectOne;
