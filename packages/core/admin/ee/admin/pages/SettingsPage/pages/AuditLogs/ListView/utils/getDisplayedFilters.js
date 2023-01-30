import ComboboxFilter from '../ComboboxFilter';
import { getDefaultMessage, actionTypes } from './formatMessage';

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

  const userOptions = users?.results.map((user) => {
    return {
      label: formatMessage(
        {
          id: 'Settings.permissions.auditLogs.user.fullname',
          defaultMessage: '{firstname} {lastname}',
        },
        {
          firstname: user.firstname,
          lastname: user.lastname,
        }
      ),
      // Combobox expects a string value
      customValue: user.id.toString(),
    };
  });

  return [
    {
      name: 'action',
      metadatas: {
        label: formatMessage({
          id: 'Settings.permissions.auditLogs.action',
          defaultMessage: 'Action',
        }),
        options: actionOptions,
        customOperators,
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
        label: formatMessage({
          id: 'Settings.permissions.auditLogs.user',
          defaultMessage: 'User',
        }),
        options: userOptions,
        customOperators: [
          ...customOperators,
          {
            intlLabel: {
              id: 'components.FilterOptions.FILTER_TYPES.$null',
              defaultMessage: 'is null',
            },
            value: '$null',
          },
          {
            intlLabel: {
              id: 'components.FilterOptions.FILTER_TYPES.$notNull',
              defaultMessage: 'is not null',
            },
            value: '$notNull',
          },
        ],
        customInput: ComboboxFilter,
      },
      fieldSchema: { type: 'relation', mainField: { name: 'id' } },
    },
  ];
};

export default getDisplayedFilters;
