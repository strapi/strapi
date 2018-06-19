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
      ];
    case 'integer':
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