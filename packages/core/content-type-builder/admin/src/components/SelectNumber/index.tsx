/**
 *
 * SelectNumber
 *
 */

import React from 'react';

import { Option, Select } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

const SelectNumber = ({ intlLabel, error, modifiedData, name, onChange, options, value }) => {
  const { formatMessage } = useIntl();
  const label = formatMessage(intlLabel);
  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';

  const handleChange = (nextValue) => {
    onChange({ target: { name, value: nextValue, type: 'select' } });

    if (!value) {
      return;
    }

    if (nextValue === 'biginteger' && value !== 'biginteger') {
      if (modifiedData.default !== undefined && modifiedData.default !== null) {
        onChange({ target: { name: 'default', value: null } });
      }

      if (modifiedData.max !== undefined && modifiedData.max !== null) {
        onChange({ target: { name: 'max', value: null } });
      }

      if (modifiedData.min !== undefined && modifiedData.min !== null) {
        onChange({ target: { name: 'min', value: null } });
      }
    }

    if (['decimal', 'float', 'integer'].includes(nextValue) && value === 'biginteger') {
      if (modifiedData.default !== undefined && modifiedData.default !== null) {
        onChange({ target: { name: 'default', value: null } });
      }

      if (modifiedData.max !== undefined && modifiedData.max !== null) {
        onChange({ target: { name: 'max', value: null } });
      }

      if (modifiedData.min !== undefined && modifiedData.min !== null) {
        onChange({ target: { name: 'min', value: null } });
      }
    }
  };

  return (
    <Select
      error={errorMessage}
      label={label}
      id={name}
      name={name}
      onChange={handleChange}
      value={value || ''}
    >
      {options.map(({ metadatas: { intlLabel, disabled, hidden }, key, value }) => {
        return (
          <Option key={key} value={value} disabled={disabled} hidden={hidden}>
            {formatMessage(intlLabel)}
          </Option>
        );
      })}
    </Select>
  );
};

SelectNumber.defaultProps = {
  error: undefined,
  value: '',
};

SelectNumber.propTypes = {
  error: PropTypes.string,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  modifiedData: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      metadatas: PropTypes.shape({
        intlLabel: PropTypes.shape({
          id: PropTypes.string.isRequired,
          defaultMessage: PropTypes.string.isRequired,
        }).isRequired,
        disabled: PropTypes.bool,
        hidden: PropTypes.bool,
      }).isRequired,
      key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    }).isRequired
  ).isRequired,
  value: PropTypes.string,
};

export default SelectNumber;
