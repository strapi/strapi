import ComboboxFilter from '../ComboboxFilter';
import { getDefaultMessage, actionTypes } from './getActionTypesDefaultMessages';

const customOperators = [
  {
    intlLabel: { id: 'components.FilterOptions.FILTER_TYPES.$eq', defaultMessage: 'is' },
    value: '$eq',
  },
  {
    intlLabel: { id: 'components.FilterOptions.FILTER_TYPES.$ne', defaultMessage: 'is not' },
    value: '$ne',
  },
];

const getDisplayedFilters = ({ formatMessage, users }) => {
  const getDisplaynameFromUser = (user) => {
    if (user.username) {
      return user.username;
    }
    if (user.firstname && user.lastname) {
      return formatMessage(
        {
          id: 'Settings.permissions.auditLogs.user.fullname',
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

  const actionOptions = Object.keys(actionTypes).map((action) => {
    return {
      label: formatMessage(
        {
          id: `Settings.permissions.auditLogs.${action}`,
          defaultMessage: getDefaultMessage(action),
        },
        { model: undefined }
      ),
      customValue: action,
    };
  });

  const userOptions =
    users &&
    users.results.map((user) => {
      return {
        label: getDisplaynameFromUser(user),
        // Combobox expects a string value
        customValue: user.id.toString(),
      };
    });

  return [
    {
      name: 'action',
      metadatas: {
        customOperators,
        label: formatMessage({
          id: 'Settings.permissions.auditLogs.action',
          defaultMessage: 'Action',
        }),
        options: actionOptions,
        customInput: ComboboxFilter,
      },
      fieldSchema: { type: 'enumeration' },
    },
    {
      name: 'date',
      metadatas: {
        label: formatMessage({
          id: 'Settings.permissions.auditLogs.date',
          defaultMessage: 'Date',
        }),
      },
      fieldSchema: { type: 'datetime' },
    },
    {
      name: 'user',
      metadatas: {
        customOperators,
        label: formatMessage({
          id: 'Settings.permissions.auditLogs.user',
          defaultMessage: 'User',
        }),
        options: userOptions,
        customInput: ComboboxFilter,
      },
      fieldSchema: { type: 'relation', mainField: { name: 'id' } },
    },
  ];
};

export default getDisplayedFilters;
