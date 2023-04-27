import React from 'react';
import PropTypes from 'prop-types';
import { ReactSelect } from '@strapi/helper-plugin';
import { FieldError, Flex, FieldLabel } from '@strapi/design-system';
import keys from './keys';

const KeySelect = ({ name, onChange, value, label }) => {
  const options = value ? [...keys, value] : keys;
  const handleChange = (value) => onChange({ target: { name, value: value?.value ?? null } });

  return (
    <Flex direction="column" gap={1} alignItems="stretch">
      <FieldLabel>{label}</FieldLabel>
      <ReactSelect
        name={name}
        inputId={name}
        isSearchable={false}
        isClearable
        onChange={handleChange}
        value={value ? { value, label: value } : null}
        options={options.map((option) => ({ value: option, label: option }))}
      />
      <FieldError />
    </Flex>
  );
};

KeySelect.defaultProps = {
  value: undefined,
};

KeySelect.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
};

export default KeySelect;
