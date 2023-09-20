/**
 *
 * SelectCategory
 *
 */

import React, { useState } from 'react';

import { ComboboxOption, CreatableCombobox } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import useDataManager from '../../hooks/useDataManager';

const SelectCategory = ({ error, intlLabel, name, onChange, value }) => {
  const { formatMessage } = useIntl();
  const { allComponentsCategories } = useDataManager();
  const [categories, setCategories] = useState(allComponentsCategories);

  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';
  const label = formatMessage(intlLabel);

  const handleChange = (value) => {
    onChange({ target: { name, value, type: 'select-category' } });
  };

  const handleCreateOption = (value) => {
    setCategories((prev) => [...prev, value]);
    handleChange(value);
  };

  return (
    <CreatableCombobox
      error={errorMessage}
      id={name}
      label={label}
      name={name}
      onChange={handleChange}
      onCreateOption={handleCreateOption}
      value={value}
    >
      {categories.map((category) => (
        <ComboboxOption key={category} value={category}>
          {category}
        </ComboboxOption>
      ))}
    </CreatableCombobox>
  );
};

SelectCategory.defaultProps = {
  error: null,
  value: null,
};

SelectCategory.propTypes = {
  error: PropTypes.string,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
};

export default SelectCategory;
