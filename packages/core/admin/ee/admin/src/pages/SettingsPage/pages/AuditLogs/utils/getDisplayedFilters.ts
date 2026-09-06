import { IntlShape } from 'react-intl';

import { Filters } from '../../../../../../../../admin/src/components/Filters';
import { GetUsers } from '../../../../../../../../shared/contracts/audit-logs';
import { ComboboxFilter, ComboboxFilterProps } from '../components/ComboboxFilter';

import { actionTypes, getDefaultMessage } from './getActionTypesDefaultMessages';

type UsersFilterProps = Pick<ComboboxFilterProps, 'loading' | 'hasMoreItems' | 'onLoadMore'>;

type AuditLogUser = NonNullable<GetUsers.Response['results']>[number];

export const getDisplayedFilters = ({
  formatMessage,
  users,
  usersFilter,
}: {
  formatMessage: IntlShape['formatMessage'];
  users: AuditLogUser[];
  usersFilter?: UsersFilterProps;
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
        label: user.displayName,
        value: user.id.toString(),
      })),
      type: 'relation',
      ...usersFilter,
    } satisfies Filters.Filter & UsersFilterProps,
  ];
};
