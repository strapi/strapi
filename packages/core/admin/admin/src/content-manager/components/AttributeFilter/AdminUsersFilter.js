import React from 'react';
import { useIntl } from 'react-intl';
import { Combobox, ComboboxOption } from '@strapi/design-system';
import { useAdminUsers } from '../../../hooks/useAdminUsers';

const AdminUsersFilter = ({ value, onChange }) => {
  const { formatMessage } = useIntl();
  const { users, isLoading } = useAdminUsers();

  const getDisplayNameFromUser = (user) => {
    if (user.username) {
      return user.username;
    }

    if (user.firstname && user.lastname) {
      return formatMessage(
        {
          id: 'content-manager.components.Filters.fullname',
          defaultMessage: '{firstname} {lastname}',
        },
        {
          firstname: user.firstname,
          lastname: user.lastname,
        }
      );
    }

    return user.email;
  };

  return (
    <Combobox value={value} onChange={onChange} loading={isLoading}>
      {users.map((user) => {
        return (
          <ComboboxOption key={user.id} value={user.id}>
            {getDisplayNameFromUser(user)}
          </ComboboxOption>
        );
      })}
    </Combobox>
  );
};

export default AdminUsersFilter;
