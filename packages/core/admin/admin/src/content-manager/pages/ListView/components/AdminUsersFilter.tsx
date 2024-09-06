import * as React from 'react';

import { Combobox, ComboboxOption, ComboboxProps } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useAdminUsers } from '../../../../services/users';
import { getDisplayName } from '../../../utils/users';

interface AdminUsersFilterProps extends Pick<ComboboxProps, 'value' | 'onChange'> {}

const AdminUsersFilter = ({ value, onChange }: AdminUsersFilterProps) => {
  const [filterValue, setFilterValue] = React.useState(value ?? '');
  const { formatMessage } = useIntl();
  const { data, isLoading } = useAdminUsers({
    _q: filterValue,
  });

  const users = data?.users || [];

  return (
    <Combobox
      value={value}
      filterValue={filterValue}
      aria-label={formatMessage({
        id: 'content-manager.components.Filters.usersSelect.label',
        defaultMessage: 'Search and select an user to filter',
      })}
      onChange={onChange}
      onInputChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        setFilterValue(e.currentTarget.value);
      }}
      loading={isLoading}
    >
      {users.map((user) => {
        return (
          <ComboboxOption key={user.id} value={user.id.toString()}>
            {getDisplayName(user, formatMessage)}
          </ComboboxOption>
        );
      })}
    </Combobox>
  );
};

export { AdminUsersFilter };
export type { AdminUsersFilterProps };
