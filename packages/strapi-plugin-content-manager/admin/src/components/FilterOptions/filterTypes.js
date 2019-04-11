const getFilters = (type) => {
  switch(type) {
    case 'string':
    case 'text':
    case 'password':
    case 'email':
      return [
        {
          id: 'content-manager.components.FilterOptions.FILTER_TYPES.=',
          value: '=',
        },
        {
          id: 'content-manager.components.FilterOptions.FILTER_TYPES._ne',
          value: '_ne',
        },
        {
          id: 'content-manager.components.FilterOptions.FILTER_TYPES._lt',
          value: '_lt',
        },
        {
          id: 'content-manager.components.FilterOptions.FILTER_TYPES._lte',
          value: '_lte',
        },
        {
          id: 'content-manager.components.FilterOptions.FILTER_TYPES._gt',
          value: '_gt',
        },
        {
          id: 'content-manager.components.FilterOptions.FILTER_TYPES._gte',
          value: '_gte',
        },
        {
          id: 'content-manager.components.FilterOptions.FILTER_TYPES._contains',
          value: '_contains',
        },
        {
          id: 'content-manager.components.FilterOptions.FILTER_TYPES._containss',
          value: '_containss',
        },
        {
          id: 'content-manager.components.FilterOptions.FILTER_TYPES._in',
          value: '_in',
        },
        {
          id: 'content-manager.components.FilterOptions.FILTER_TYPES._nin',
          value: '_nin',
        },
      ];
    case 'integer':
    case 'biginteger':
    case 'float':
    case 'decimal':
    case 'date':
      return [
        {
          id: 'content-manager.components.FilterOptions.FILTER_TYPES.=',
          value: '=',
        },
        {
          id: 'content-manager.components.FilterOptions.FILTER_TYPES._ne',
          value: '_ne',
        },
        {
          id: 'content-manager.components.FilterOptions.FILTER_TYPES._lt',
          value: '_lt',
        },
        {
          id: 'content-manager.components.FilterOptions.FILTER_TYPES._lte',
          value: '_lte',
        },
        {
          id: 'content-manager.components.FilterOptions.FILTER_TYPES._gt',
          value: '_gt',
        },
        {
          id: 'content-manager.components.FilterOptions.FILTER_TYPES._gte',
          value: '_gte',
        },
        {
          id: 'content-manager.components.FilterOptions.FILTER_TYPES._in',
          value: '_in',
        },
        {
          id: 'content-manager.components.FilterOptions.FILTER_TYPES._nin',
          value: '_nin',
        },
      ];
    default:
      return [
        {
          id: 'content-manager.components.FilterOptions.FILTER_TYPES.=',
          value: '=',
        },
        {
          id: 'content-manager.components.FilterOptions.FILTER_TYPES._ne',
          value: '_ne',
        },
      ];
    
  }
};

export default getFilters;