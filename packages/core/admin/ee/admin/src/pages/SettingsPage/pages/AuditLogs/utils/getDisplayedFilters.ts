import { IntlShape } from 'react-intl';

import { Filters } from '../../../../../../../../admin/src/components/Filters';
import { getDisplayName } from '../../../../../../../../admin/src/utils/users';
import { SanitizedAdminUser } from '../../../../../../../../shared/contracts/shared';
import { ComboboxFilter } from '../components/ComboboxFilter';

import { actionTypes, getDefaultMessage } from './getActionTypesDefaultMessages';

export const getDisplayedFilters = ({
  formatMessage,
  users,
  canReadUsers,
}: {
  formatMessage: IntlShape['formatMessage'];
  users: SanitizedAdminUser[];
  canReadUsers: boolean;
}): Filters.Filter[] => {
  const operators = [
    {
      label: formatMessage({
        id: 'components.FilterOptions.FILTER_TYPES.$eq',
        defaultMessage: 'is',
      }),
      value: '$eq',
    },
    {
      label: formatMessage({
        id: 'components.FilterOptions.FILTER_TYPES.$ne',
        defaultMessage: 'is not',
      }),
      value: '$ne',
    },
  ] as NonNullable<Filters.Filter['operators']>;

  const filters = [
    {
      input: ComboboxFilter,
      label: formatMessage({
        id: 'Settings.permissions.auditLogs.action',
        defaultMessage: 'Action',
      }),
      name: 'action',
      operators,
      options: (Object.keys(actionTypes) as (keyof typeof actionTypes)[]).map((action) => ({
        label: formatMessage(
          {
            id: `Settings.permissions.auditLogs.${action}`,
            defaultMessage: getDefaultMessage(action),
          },
          { model: undefined }
        ),
        value: action,
      })),
      type: 'enumeration',
    },
    {
      label: formatMessage({
        id: 'Settings.permissions.auditLogs.date',
        defaultMessage: 'Date',
      }),
      name: 'date',
      type: 'datetime',
    },
  ] satisfies Filters.Filter[];

  if (canReadUsers && users) {
    return [
      ...filters,
      {
        input: ComboboxFilter,
        label: formatMessage({
          id: 'Settings.permissions.auditLogs.user',
          defaultMessage: 'User',
        }),
        mainField: { name: 'id', type: 'integer' },
        name: 'user',
        operators,
        options: users.map((user) => ({
          label: getDisplayName(user),
          value: user.id.toString(),
        })),
        type: 'relation',
      } satisfies Filters.Filter,
    ];
  }

  return filters;
};
