import { Combobox, ComboboxOption, ComboboxProps } from '@strapi/design-system';
import { useIntl } from 'react-intl';

type ComboboxFilterProps = {
  value?: string;
  options?: { label: string; customValue: string }[];
  onChange?: ComboboxProps['onChange'];
};

export const ComboboxFilter = (
  { value, options, onChange }: ComboboxFilterProps = {
    value: undefined,
  }
) => {
  const { formatMessage } = useIntl();
  const ariaLabel = formatMessage({
    id: 'Settings.permissions.auditLogs.filter.aria-label',
    defaultMessage: 'Search and select an option to filter',
  });

  return (
    <Combobox aria-label={ariaLabel} value={value} onChange={onChange}>
      {options?.map(({ label, customValue }) => {
        return (
          <ComboboxOption key={customValue} value={customValue}>
            {label}
          </ComboboxOption>
        );
      })}
    </Combobox>
  );
};
