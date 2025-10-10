import { Combobox, ComboboxOption } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { Filters } from '../../../../../../../../admin/src/components/Filters';
import { useField } from '../../../../../../../../admin/src/components/Form';

export const ComboboxFilter = (props: Filters.ValueInputProps) => {
  const { formatMessage } = useIntl();
  const field = useField(props.name);
  const ariaLabel = formatMessage({
    id: 'Settings.permissions.auditLogs.filter.aria-label',
    defaultMessage: 'Search and select an option to filter',
  });

  const handleChange = (value?: string) => {
    field.onChange(props.name, value);
  };

  return (
    <Combobox aria-label={ariaLabel} value={field.value} onChange={handleChange}>
      {props.options?.map((opt) => {
        const value = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        return (
          <ComboboxOption key={value} value={value}>
            {label}
          </ComboboxOption>
        );
      })}
    </Combobox>
  );
};
