import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { ComboboxOption, CreatableCombobox } from '@strapi/design-system/Combobox';
import keys from './keys';

const Combobox = ({ name, onChange, value, ...props }) => {
  const [options, setOptions] = useState(value ? [...keys, value] : keys);

  const handleChange = value => {
    onChange({ target: { name, value } });
  };

  const handleCreateOption = value => {
    setOptions(prev => [...prev, value]);

    onChange({ target: { name, value } });
  };

  return (
    <CreatableCombobox
      {...props}
      onChange={handleChange}
      onCreateOption={handleCreateOption}
      placeholder=""
      value={value}
    >
      {options.map(key => (
        <ComboboxOption value={key} key={key}>
          {key}
        </ComboboxOption>
      ))}
    </CreatableCombobox>
  );
};

Combobox.defaultProps = {
  value: undefined,
};

Combobox.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
};

export default Combobox;
