const getFilterType = type => {
  switch (type) {
    case 'string':
    case 'text':
    case 'password':
    case 'email':
      return [
        {
          id: 'components.FilterOptions.FILTER_TYPES.=',
          value: '=',
        },
        {
          id: 'components.FilterOptions.FILTER_TYPES._ne',
          value: '_ne',
        },
        {
          id: 'components.FilterOptions.FILTER_TYPES._lt',
          value: '_lt',
        },
        {
          id: 'components.FilterOptions.FILTER_TYPES._lte',
          value: '_lte',
        },
        {
          id: 'components.FilterOptions.FILTER_TYPES._gt',
          value: '_gt',
        },
        {
          id: 'components.FilterOptions.FILTER_TYPES._gte',
          value: '_gte',
        },
        {
          id: 'components.FilterOptions.FILTER_TYPES._contains',
          value: '_contains',
        },
        {
          id: 'components.FilterOptions.FILTER_TYPES._containss',
          value: '_containss',
        },
        {
          id: 'components.FilterOptions.FILTER_TYPES._in',
          value: '_in',
        },
        {
          id: 'components.FilterOptions.FILTER_TYPES._nin',
          value: '_nin',
        },
      ];
    case 'integer':
    case 'biginteger':
    case 'float':
    case 'decimal':
    case 'date':
    case 'datetime':
    case 'time':
    case 'timestamp':
    case 'timestampUpdate':
      return [
        {
          id: 'components.FilterOptions.FILTER_TYPES.=',
          value: '=',
        },
        {
          id: 'components.FilterOptions.FILTER_TYPES._ne',
          value: '_ne',
        },
        {
          id: 'components.FilterOptions.FILTER_TYPES._lt',
          value: '_lt',
        },
        {
          id: 'components.FilterOptions.FILTER_TYPES._lte',
          value: '_lte',
        },
        {
          id: 'components.FilterOptions.FILTER_TYPES._gt',
          value: '_gt',
        },
        {
          id: 'components.FilterOptions.FILTER_TYPES._gte',
          value: '_gte',
        },
        // FIXME: commenting these filters as I am not sure if the UI
        // corresponds to the filter
        // {
        //   id: 'components.FilterOptions.FILTER_TYPES._in',
        //   value: '_in',
        // },
        // {
        //   id: 'components.FilterOptions.FILTER_TYPES._nin',
        //   value: '_nin',
        // },
      ];
    case 'enum':
      return [
        {
          id: 'components.FilterOptions.FILTER_TYPES.=',
          value: '_contains',
        },
        {
          id: 'components.FilterOptions.FILTER_TYPES._ne',
          value: '_ncontains',
        },
      ];
    case 'size':
      return [
        {
          id: 'components.FilterOptions.FILTER_TYPES.=',
          value: '_contains',
        },
        {
          id: 'components.FilterOptions.FILTER_TYPES._lte',
          value: '_lte',
        },
        {
          id: 'components.FilterOptions.FILTER_TYPES._gte',
          value: '_gte',
        },
      ];
    default:
      return [
        {
          id: 'components.FilterOptions.FILTER_TYPES.=',
          value: '=',
        },
        {
          id: 'components.FilterOptions.FILTER_TYPES._ne',
          value: '_ne',
        },
      ];
  }
};

export default getFilterType;
