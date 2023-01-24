import React from 'react';
import PropTypes from 'prop-types';
import { Combobox, ComboboxOption } from '@strapi/design-system/Combobox';

const ComboboxFilter = ({ value, options, onChange }) => {
  return (
    <Combobox aria-label="combobox input" value={value} onChange={onChange}>
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
  onChange: PropTypes.func.isRequired,
};

export default ComboboxFilter;
