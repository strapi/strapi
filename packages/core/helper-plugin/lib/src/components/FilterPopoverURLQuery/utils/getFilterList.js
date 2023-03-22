/**
 * Depending on the selected field find the possible filters to apply
 * @param {Object} fieldSchema.type the type of the filter
 * @returns {Object[]}
 */
const getFilterList = ({ fieldSchema: { type: fieldType, mainField } }) => {
  const type = mainField?.schema?.type ?? fieldType;

  switch (type) {
    case 'email':
    case 'text':
    case 'enumeration':
    case 'string': {
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
        // {
        //   intlLabel: {
        //     id: 'components.FilterOptions.FILTER_TYPES.$nei',
        //     defaultMessage: 'is not (case insensitive)',
        //   },
        //   value: '$nei',
        // },
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
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$startsWith',
            defaultMessage: 'starts with',
          },
          value: '$startsWith',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$startsWithi',
            defaultMessage: 'starts with (case insensitive)',
          },
          value: '$startsWithi',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$endsWith',
            defaultMessage: 'ends with',
          },
          value: '$endsWith',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$endsWithi',
            defaultMessage: 'ends with (case insensitive)',
          },
          value: '$endsWithi',
        },
      ];
    }

    case 'float':
    case 'integer':
    case 'biginteger':
    case 'decimal': {
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
    case 'time':
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
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$contains',
            defaultMessage: 'contains (sensitive)',
          },
          value: '$contains',
        },
        {
          intlLabel: {
            id: 'components.FilterOptions.FILTER_TYPES.$notContains',
            defaultMessage: 'not contains (sensitive)',
          },
          value: '$notContains',
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

    case 'datetime': {
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
