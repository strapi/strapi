import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { Select, Option } from '@strapi/design-system';

const TokenTypeSelect = ({ name, errors, values, onChange, canEditInputs, options, label }) => {
  const { formatMessage } = useIntl();

  return (
    <Select
      name={name}
      label={formatMessage({
        id: label.id,
        defaultMessage: label.defaultMessage,
      })}
      value={values && values[name]}
      error={
        errors[name]
          ? formatMessage(
              errors[name]?.id ? errors[name] : { id: errors[name], defaultMessage: errors[name] }
            )
          : null
      }
      onChange={onChange}
      placeholder="Select"
      required
      disabled={!canEditInputs}
    >
      {options &&
        options.map(({ value, label }) => (
          <Option key={value} value={value}>
            {formatMessage(label)}
          </Option>
        ))}
    </Select>
  );
};

TokenTypeSelect.propTypes = {
  name: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.shape({
        id: PropTypes.string,
        defaultMessage: PropTypes.string,
      }),
      value: PropTypes.string,
    })
  ),
  errors: PropTypes.shape({
    type: PropTypes.string,
  }),
  onChange: PropTypes.func.isRequired,
  canEditInputs: PropTypes.bool.isRequired,
  values: PropTypes.shape({
    type: PropTypes.string,
  }).isRequired,
  label: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
  }).isRequired,
};

TokenTypeSelect.defaultProps = {
  name: 'type',
  errors: {},
  options: [],
};

export default TokenTypeSelect;
