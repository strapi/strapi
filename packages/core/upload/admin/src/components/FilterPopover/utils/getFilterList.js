/**
 * Depending on the selected field find the possible filters to apply
 * @param {Object} fieldSchema.type the type of the filter
 * @returns {Object[]}
 */
const getFilterList = ({ fieldSchema: { type: fieldType, mainField } }) => {
  const type = mainField?.schema.type ? mainField.schema.type : fieldType;

  switch (type) {
    case 'enumeration': {
      return [
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$contains',
            defaultMessage: 'contains',
          },
          value: '$contains',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$containsi',
            defaultMessage: 'contains (case insensitive)',
          },
          value: '$containsi',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$notContains',
            defaultMessage: 'not contains',
          },
          value: '$notContains',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$notContainsi',
            defaultMessage: 'not contains (case insensitive)',
          },
          value: '$notContainsi',
        },
      ];
    }

    case 'date': {
      return [
        {
          intlLabel: { id: 'components.FilterOptions.FILTER_TYPES.$eq', defaultMessage: 'is' },
          value: '$eq',
        },
        {
          intlLabel: { id: 'components.FilterOptions.FILTER_TYPES.$ne', defaultMessage: 'is not' },
          value: '$ne',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$gt',
            defaultMessage: 'is greater than',
          },
          value: '$gt',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$gte',
            defaultMessage: 'is greater than or equal to',
          },
          value: '$gte',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$lt',
            defaultMessage: 'is less than',
          },
          value: '$lt',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$lte',
            defaultMessage: 'is less than or equal to',
          },
          value: '$lte',
        },
      ];
    }

    default:
      return [
        {
          intlLabel: { id: 'components.FilterOptions.FILTER_TYPES.$eq', defaultMessage: 'is' },
          value: '$eq',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$eqi',
            defaultMessage: 'is (case insensitive)',
          },
          value: '$eqi',
        },
        {
          intlLabel: { id: 'components.FilterOptions.FILTER_TYPES.$ne', defaultMessage: 'is not' },
          value: '$ne',
        },
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
      ];
  }
};

export default getFilterList;
