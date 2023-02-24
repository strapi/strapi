import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { Select, Option } from '@strapi/design-system';

const TokenTypeSelect = ({ errors, values, onChange, canEditInputs, options, label }) => {
  const { formatMessage } = useIntl();

  return (
    <Select
      name="type"
      label={formatMessage({
        id: label.id,
        defaultMessage: label.defaultMessage,
      })}
      value={values?.type}
      error={
        errors.type
          ? formatMessage(
              errors.type?.id ? errors.type : { id: errors.type, defaultMessage: errors.type }
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
  errors: {},
  options: [],
};

export default TokenTypeSelect;
