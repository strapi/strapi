import { Combobox, ComboboxOption, ComboboxProps } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getDisplayName } from '../../../../../../../admin/src/content-manager/utils/users';
import { useAdminUsers } from '../../../../../../../admin/src/services/users';

interface AssigneeFilterProps extends Pick<ComboboxProps, 'value' | 'onChange'> {}

const AssigneeFilter = ({ value, onChange }: AssigneeFilterProps) => {
  const { formatMessage } = useIntl();
  const { data, isLoading } = useAdminUsers();
  const users = data?.users || [];

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

export { AssigneeFilter };
export type { AssigneeFilterProps };
