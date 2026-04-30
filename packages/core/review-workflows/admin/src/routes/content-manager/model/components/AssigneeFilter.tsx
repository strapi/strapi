import * as React from 'react';

import { type Filters, useAdminUsers, useField } from '@strapi/admin/strapi-admin';
import { Combobox, ComboboxOption, ComboboxProps } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getDisplayName } from '../../../../utils/users';

interface AssigneeFilterProps extends Pick<ComboboxProps, 'value' | 'onChange'> {}

const AssigneeFilter = ({ name }: Filters.ValueInputProps) => {
  const [page, setPage] = React.useState(1);
  const [hasOpened, setHasOpened] = React.useState(false);
  const { formatMessage } = useIntl();
  const { data, isLoading } = useAdminUsers({ page }, { skip: !hasOpened });

  const field = useField(name);

  const handleChange = (value?: string) => {
    setPage(1);
    field.onChange(name, value);
  };

  const handleOpenChange = (isOpen?: boolean) => {
    if (isOpen && !hasOpened) {
      setHasOpened(true);
    }
  };

  const options = React.useMemo(
    () =>
      (data?.users ?? []).map((user) => ({
        id: user.id,
        label: getDisplayName(user),
      })),
    [data?.users]
  );

  return (
    <Combobox
      value={field.value}
      aria-label={formatMessage({
        id: 'content-manager.components.Filters.usersSelect.label',
        defaultMessage: 'Search and select an user to filter',
      })}
      onChange={handleChange}
      onOpenChange={handleOpenChange}
      loading={isLoading}
      onLoadMore={() => setPage((prev) => prev + 1)}
    >
      {options.map((option) => (
        <ComboboxOption key={option.id} value={option.id.toString()}>
          {option.label}
        </ComboboxOption>
      ))}
    </Combobox>
  );
};

export { AssigneeFilter };
export type { AssigneeFilterProps };
