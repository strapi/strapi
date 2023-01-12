import ComboboxFilter from '../Filters/ComboboxFilter';

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

const getDisplayedFilters = ({ actionOptions, userOptions }) => {
  return [
    {
      name: 'action',
      metadatas: {
        label: 'Action',
        options: actionOptions,
        customOperators,
        customInput: ComboboxFilter,
      },
      fieldSchema: { type: 'enumeration' },
    },
    {
      name: 'user',
      metadatas: {
        label: 'User',
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
      fieldSchema: { type: 'relation', mainField: { name: 'id', schema: { type: 'integer' } } },
    },
    {
      name: 'date',
      metadatas: { label: 'Date' },
      fieldSchema: { type: 'datetime' },
    },
  ];
};

export default getDisplayedFilters;
