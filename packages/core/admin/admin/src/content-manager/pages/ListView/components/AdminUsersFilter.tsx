import { Combobox, ComboboxOption, ComboboxProps } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useAdminUsers } from '../../../../hooks/useAdminUsers';
import { getDisplayName } from '../../../utils/users';

interface AdminUsersFilterProps extends Pick<ComboboxProps, 'value' | 'onChange'> {}

const AdminUsersFilter = ({ value, onChange }: AdminUsersFilterProps) => {
  const { formatMessage } = useIntl();
  const { users, isLoading } = useAdminUsers();

  return (
    <Combobox
      value={value}
      aria-label={formatMessage({
        id: 'content-manager.components.Filters.usersSelect.label',
        defaultMessage: 'Search and select an user to filter',
      })}
      onChange={onChange}
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
