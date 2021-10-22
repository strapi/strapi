import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { ComboboxOption, CreatableCombobox } from '@strapi/parts/Combobox';
import keys from './keys';

const Combobox = ({ name, onChange, ...props }) => {
  const [options, setOptions] = useState(keys);

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
    >
      {options.map(key => (
        <ComboboxOption value={key} key={key}>
          {key}
        </ComboboxOption>
      ))}
    </CreatableCombobox>
  );
};

Combobox.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default Combobox;
