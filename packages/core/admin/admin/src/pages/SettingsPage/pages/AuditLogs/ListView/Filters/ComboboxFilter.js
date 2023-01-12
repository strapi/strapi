import React from 'react';
import PropTypes from 'prop-types';
import { Combobox, ComboboxOption } from '@strapi/design-system/Combobox';

const ComboboxFilter = ({ value, options, setModifiedData }) => {
  return (
    <Combobox
      aria-label="filter"
      value={value}
      onChange={(value) => setModifiedData((prev) => ({ ...prev, value }))}
    >
      {options.map(({ label, customValue }) => {
        return (
          <ComboboxOption key={customValue} value={customValue}>
            {label}
          </ComboboxOption>
        );
      })}
    </Combobox>
  );
};

ComboboxFilter.defaultProps = {
  value: null,
};

ComboboxFilter.propTypes = {
  value: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      customValue: PropTypes.string.isRequired,
    })
  ).isRequired,
  setModifiedData: PropTypes.func.isRequired,
};

export default ComboboxFilter;
