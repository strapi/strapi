import React from 'react';
import PropTypes from 'prop-types';
import { Select, Option } from '@strapi/design-system/Select';

const FilterSelect = ({
  message,
  value,
  onChange,
  name,
  possibleFilters,
  onClear,
  customizeContent,
}) => {
  return (
    <Select
      aria-label={message}
      placeholder={message}
      name={name}
      size="M"
      onChange={onChange}
      onClear={onClear}
      value={value}
      customizeContent={customizeContent}
      multi
    >
      {Object.entries(possibleFilters).map(([name, count]) => {
        return (
          <Option key={name} value={name}>
            {name} ({count})
          </Option>
        );
      })}
    </Select>
  );
};

FilterSelect.propTypes = {
  message: PropTypes.string.isRequired,
  value: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  possibleFilters: PropTypes.object.isRequired,
  onClear: PropTypes.func.isRequired,
  customizeContent: PropTypes.func.isRequired,
};

export default FilterSelect;
