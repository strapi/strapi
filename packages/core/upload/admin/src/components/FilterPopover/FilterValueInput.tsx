import * as React from 'react';

import { DateTimePicker, SingleSelectOption, SingleSelect } from '@strapi/design-system';
import { useIntl } from 'react-intl';

interface FilterValueInputProps {
  label?: string;
  options?: { label: string; value: string }[];
  onChange: (value: string) => void;
  type?: string;
  value?: string;
}

const FilterValueInput = ({
  label = '',
  onChange,
  options = [],
  type,
  value = '',
}: FilterValueInputProps) => {
  const { formatMessage } = useIntl();

  if (type === 'date') {
    return (
      <DateTimePicker
        clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
        aria-label={label}
        name="datetimepicker"
        onChange={(date: Date | undefined) => {
          const formattedDate = date ? new Date(date).toISOString() : '';

          onChange(formattedDate);
        }}
        onClear={() => onChange('')}
        value={value ? new Date(value) : undefined}
      />
    );
  }

  return (
    <SingleSelect
      aria-label={label}
      onChange={(value: string | number) => onChange(value.toString())}
      value={value}
    >
      {options?.map((option) => {
        return (
          <SingleSelectOption key={option.value} value={option.value}>
            {option.label}
          </SingleSelectOption>
        );
      })}
    </SingleSelect>
  );
};

export default FilterValueInput;
