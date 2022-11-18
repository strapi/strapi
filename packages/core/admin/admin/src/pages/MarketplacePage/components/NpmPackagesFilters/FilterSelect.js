import React from 'react';
import PropTypes from 'prop-types';
import { Select, Option } from '@strapi/design-system/Select';

const FilterSelect = ({ message, value, onChange, possibleFilters, onClear, customizeContent }) => {
  const computeFilterMessage = (filterName, count) => {
    return `${filterName} (${count})`;
  };

  return (
    <Select
      data-testid={`${message}-button`}
      aria-label={message}
      placeholder={message}
      size="M"
      onChange={onChange}
      onClear={onClear}
      value={value}
      customizeContent={customizeContent}
      multi
    >
      {Object.entries(possibleFilters).map(([filterName, count]) => {
        return (
          <Option data-testid={`${filterName}-${count}`} key={filterName} value={filterName}>
            {computeFilterMessage(filterName, count)}
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
  possibleFilters: PropTypes.object.isRequired,
  onClear: PropTypes.func.isRequired,
  customizeContent: PropTypes.func.isRequired,
};

export default FilterSelect;
