import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useFormikContext } from 'formik';
import { ComboboxOption, CreatableCombobox } from '@strapi/design-system';
import { keys } from './constants';

const Combobox = ({ name, onChange, value, ...props }) => {
  const {
    values: { headers },
  } = useFormikContext();
  const [options, setOptions] = useState(keys);

  useEffect(() => {
    setOptions(
      keys.filter((key) => !headers?.some((header) => header.key !== value && header.key === key))
    );
  }, [headers, value]);

  const handleChange = (value) => {
    onChange({ target: { name, value } });
  };

  const handleCreateOption = (value) => {
    setOptions((prev) => [...prev, value]);

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
      {options.map((key) => (
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
