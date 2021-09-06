/**
 * Depending on the selected field find the possible filters to apply
 * @param {Object} fieldSchema.type the type of the filter
 * @returns {Object[]}
 */
const getFilterList = ({ fieldSchema: { type } }) => {
  // TODO needs to be improved for the CM
  switch (type) {
    case 'email':
    case 'string': {
      return [
        { label: 'is', value: '$eq' },
        { label: 'is not', value: '$ne' },
        { label: 'contains', value: '$contains' },
      ];
    }
    default:
      return [
        { label: 'is', value: '$eq' },
        { label: 'is not', value: '$ne' },
      ];
  }
};

export default getFilterList;
