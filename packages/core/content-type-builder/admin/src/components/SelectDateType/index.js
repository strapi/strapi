/**
 *
 * SelectDateType
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Select, Option } from '@strapi/design-system/Select';

const SelectDateType = ({ intlLabel, error, modifiedData, name, onChange, options, value }) => {
  const { formatMessage } = useIntl();
  const label = formatMessage(intlLabel);
  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';

  const handleChange = (nextValue) => {
    onChange({ target: { name, value: nextValue, type: 'select' } });

    if (!value) {
      return;
    }

    if (modifiedData.default !== undefined && modifiedData.default !== null) {
      onChange({ target: { name: 'default', value: null } });
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
            {formatMessage(
              { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
              intlLabel.values
            )}
          </Option>
        );
      })}
    </Select>
  );
};

SelectDateType.defaultProps = {
  error: undefined,
  value: '',
};

SelectDateType.propTypes = {
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

export default SelectDateType;
