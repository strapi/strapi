import React from 'react';

import { Combobox, ComboboxOption } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { getDisplayName } from '../../../../../../../admin/src/content-manager/utils/getDisplayName';
import { useAdminUsers } from '../../../../../../../admin/src/hooks/useAdminUsers';

export const AssigneeFilter = ({ value, onChange }) => {
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

AssigneeFilter.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
};

AssigneeFilter.defaultProps = {
  value: '',
};
