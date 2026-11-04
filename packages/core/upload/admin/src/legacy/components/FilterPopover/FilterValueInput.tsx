import { DateTimePicker, SingleSelectOption, SingleSelect } from '@strapi/design-system';
import { useIntl } from 'react-intl';

const EMPTY_OPTIONS: NonNullable<FilterValueInputProps['options']> = [];

interface FilterValueInputProps {
  label?: string;
  onChange: (value: string) => void;
  options?: { label?: string; value: string }[];
  type?: string;
  value?: string;
}

export const FilterValueInput = ({
  label = '',
  onChange,
  options = EMPTY_OPTIONS,
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
        onChange={(date) => {
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
