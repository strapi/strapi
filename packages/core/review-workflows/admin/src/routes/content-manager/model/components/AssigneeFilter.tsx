import * as React from 'react';

import { type Filters, useAdminUsers, useField } from '@strapi/admin/strapi-admin';
import { Combobox, ComboboxOption, ComboboxProps } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getDisplayName } from '../../../../utils/users';

interface AssigneeFilterProps extends Pick<ComboboxProps, 'value' | 'onChange'> {}

const PAGE_SIZE = 10;

const AssigneeFilter = ({ name }: Filters.ValueInputProps) => {
  const [pageSize, setPageSize] = React.useState(PAGE_SIZE);
  const [hasOpened, setHasOpened] = React.useState(false);
  const { formatMessage } = useIntl();
  const field = useField(name);
  const shouldFetch = hasOpened || Boolean(field.value);
  const { data, isLoading } = useAdminUsers({ pageSize }, { skip: !shouldFetch });

  const handleChange = (value?: string) => {
    setPageSize(PAGE_SIZE);
    field.onChange(name, value);
  };

  const handleOpenChange = (isOpen?: boolean) => {
    if (isOpen && !hasOpened) {
      setHasOpened(true);
    }
  };

  const { pageCount = 1, page = 1 } = data?.pagination ?? {};
  const hasMoreItems = page < pageCount;

  const handleLoadMore = () => {
    if (!hasMoreItems) {
      return;
    }
    setPageSize((prev) => prev + PAGE_SIZE);
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
      onLoadMore={handleLoadMore}
      hasMoreItems={hasMoreItems}
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
