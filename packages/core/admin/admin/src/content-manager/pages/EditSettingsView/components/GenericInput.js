import React from 'react';

import { Option, Select, TextInput, ToggleInput } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

const GenericInput = ({ type, options, onChange, value, name, ...inputProps }) => {
  const { formatMessage } = useIntl();

  switch (type) {
    case 'text': {
      return <TextInput onChange={onChange} value={value} name={name} {...inputProps} />;
    }
    case 'bool': {
      return (
        <ToggleInput
          onChange={(e) => {
            onChange({ target: { name, value: e.target.checked } });
          }}
          checked={value}
          name={name}
          onLabel={formatMessage({
            id: 'app.components.ToggleCheckbox.on-label',
            defaultMessage: 'On',
          })}
          offLabel={formatMessage({
            id: 'app.components.ToggleCheckbox.off-label',
            defaultMessage: 'Off',
          })}
          {...inputProps}
        />
      );
    }
    case 'select': {
      return (
        <Select
          value={value}
          name={name}
          onChange={(value) => onChange({ target: { name, value } })}
          {...inputProps}
        >
          {options.map((option) => (
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
