import React from 'react';
import PropTypes from 'prop-types';
import { TextInput } from '@strapi/design-system/TextInput';
import { ToggleInput } from '@strapi/design-system/ToggleInput';
import { Select, Option } from '@strapi/design-system/Select';

const GenericInput = ({ type, options, onChange, value, name, ...inputProps }) => {
  switch (type) {
    case 'text': {
      return <TextInput onChange={onChange} value={value} name={name} {...inputProps} />;
    }
    case 'bool': {
      return (
        <ToggleInput
          onChange={e => {
            onChange({ target: { name, value: e.target.checked } });
          }}
          checked={value === null ? null : value || false}
          name={name}
          onLabel="true"
          offLabel="false"
          {...inputProps}
        />
      );
    }
    case 'select': {
      return (
        <Select
          value={value}
          name={name}
          onChange={value => onChange({ target: { name, value } })}
          {...inputProps}
        >
          {options.map(option => (
            <Option key={option} value={option}>
              {option}
            </Option>
          ))}
        </Select>
      );
    }
    default:
      return null;
  }
};

GenericInput.defaultProps = {
  options: undefined,
};

GenericInput.propTypes = {
  type: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]).isRequired,
  name: PropTypes.string.isRequired,
};

export default GenericInput;
