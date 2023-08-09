import React from 'react';

import { DateTimePicker, Option, Select } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

const FilterValueInput = ({ label, onChange, options, type, value }) => {
  const { formatMessage } = useIntl();

  if (type === 'date') {
    return (
      <DateTimePicker
        clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
        ariaLabel={label}
        name="datetimepicker"
        onChange={(date) => {
          const formattedDate = date ? new Date(date).toISOString() : '';

          onChange(formattedDate);
        }}
        onClear={() => onChange('')}
        value={value ? new Date(value) : undefined}
        selectedDateLabel={(formattedDate) => `Date picker, current is ${formattedDate}`}
        selectButtonTitle={formatMessage({ id: 'selectButtonTitle', defaultMessage: 'Select' })}
      />
    );
  }

  return (
    <Select aria-label={label} onChange={onChange} value={value}>
      {options.map((option) => {
        return (
          <Option key={option.value} value={option.value}>
            {option.label}
          </Option>
        );
      })}
    </Select>
  );
};

FilterValueInput.defaultProps = {
  label: '',
  options: [],
  value: '',
};

FilterValueInput.propTypes = {
  label: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({ label: PropTypes.string.isRequired, value: PropTypes.string.isRequired })
  ),
  type: PropTypes.string.isRequired,
  value: PropTypes.any,
};

export default FilterValueInput;
