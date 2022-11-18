import React from 'react';
import PropTypes from 'prop-types';
import parseISO from 'date-fns/parseISO';
import formatISO from 'date-fns/formatISO';
import { DatePicker } from '@strapi/design-system/DatePicker';
import { Field, FieldInput } from '@strapi/design-system/Field';
import { NumberInput } from '@strapi/design-system/NumberInput';
import { TimePicker } from '@strapi/design-system/TimePicker';
import { Select, Option } from '@strapi/design-system/Select';
import { useIntl } from 'react-intl';
import DateTimePicker from '../DateTimePicker';

const Inputs = ({ label, onChange, options, type, value }) => {
  const { formatMessage } = useIntl();

  if (type === 'boolean') {
    return (
      <Select
        // FIXME: stop errors in the console
        aria-label={label}
        onChange={onChange}
        value={value}
      >
        <Option value="true">true</Option>
        <Option value="false">false</Option>
      </Select>
    );
  }

  if (type === 'date') {
    return (
      <DatePicker
        clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
        ariaLabel={label}
        name="datepicker"
        onChange={(date) => onChange(formatISO(date, { representation: 'date' }))}
        onClear={() => onChange(null)}
        selectedDate={value ? parseISO(value) : null}
        selectedDateLabel={(formattedDate) => `Date picker, current is ${formattedDate}`}
      />
    );
  }

  if (type === 'datetime') {
    return (
      <DateTimePicker
        clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
        ariaLabel={label}
        name="datetimepicker"
        onChange={(date) => onChange(date.toISOString())}
        onClear={() => onChange(null)}
        value={value ? new Date(value) : null}
        selectedDateLabel={(formattedDate) => `Date picker, current is ${formattedDate}`}
      />
    );
  }

  if (type === 'enumeration') {
    return (
      <Select
        // FIXME: stop errors in the console
        aria-label={label}
        onChange={onChange}
        value={value}
      >
        {options.map((optionValue) => {
          return (
            <Option key={optionValue} value={optionValue}>
              {optionValue}
            </Option>
          );
        })}
      </Select>
    );
  }

  if (['float', 'integer', 'biginteger', 'decimal'].includes(type)) {
    return (
      <NumberInput
        aria-label={label}
        name="filter-value"
        onValueChange={onChange}
        value={value || 0}
      />
    );
  }

  if (type === 'time') {
    return (
      <TimePicker
        aria-label={label}
        onClear={() => onChange('')}
        onChange={onChange}
        value={value}
        clearLabel="Clear the selected time picker value"
      />
    );
  }

  return (
    <Field>
      <FieldInput // FIXME: stop errors in the console
        aria-label={formatMessage({ id: 'app.utils.filter-value', defaultMessage: 'Filter value' })}
        onChange={({ target: { value } }) => onChange(value)}
        value={value}
        size="M"
      />
    </Field>
  );
};

Inputs.defaultProps = {
  label: '',
  options: [],
  value: '',
};

Inputs.propTypes = {
  label: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.string),
  type: PropTypes.string.isRequired,
  value: PropTypes.any,
};

export default Inputs;
