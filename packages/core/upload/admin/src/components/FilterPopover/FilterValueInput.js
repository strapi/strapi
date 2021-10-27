import React from 'react';
import PropTypes from 'prop-types';
import { DatePicker } from '@strapi/design-system/DatePicker';
import { Select, Option } from '@strapi/design-system/Select';
import { useIntl } from 'react-intl';
import { formatISO } from 'date-fns';
import cloneDeep from 'lodash/cloneDeep';

const FilterValueInput = ({ label, onChange, options, type, value }) => {
  const { formatMessage } = useIntl();

  if (type === 'date') {
    return (
      <DatePicker
        clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
        aria-label={label}
        name="datepicker"
        onChange={date => {
          const formattedDate = formatISO(cloneDeep(date), { representation: 'date' });

          onChange(formattedDate);
        }}
        onClear={() => onChange('')}
        selectedDate={value ? new Date(value) : null}
        selectedDateLabel={formattedDate => `Date picker, current is ${formattedDate}`}
      />
    );
  }

  return (
    <Select aria-label={label} onChange={onChange} value={value}>
      {options.map(option => {
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
