/**
 * Depending on the selected field find the possible filters to apply
 * @param {Object} fieldSchema.type the type of the filter
 * @returns {Object[]}
 */
const getFilterList = ({ fieldSchema: { type: fieldType, mainField } }) => {
  const type = mainField?.schema.type ? mainField.schema.type : fieldType;

  // TODO needs to be improved for the CM
  // TODO translate
  switch (type) {
    case 'email':
    case 'text':
    case 'string': {
      return [
        { label: 'is', value: '$eq' },
        { label: 'is not', value: '$ne' },
        { label: 'contains', value: '$contains' },
        // TODO
        // { label: 'not contains', value: '$not_$contains' },
      ];
    }
    case 'enumeration': {
      return [
        { label: 'is', value: '$eq' },
        { label: 'is not', value: '$ne' },
        // { label: 'not contains', value: '$not_$contains' },
      ];
    }
    case 'float':
    case 'integer':
    case 'biginteger':
    case 'decimal':
    case 'date': {
      return [
        { label: 'is', value: '$eq' },
        { label: 'is not', value: '$ne' },
        { label: 'contains', value: '$contains' },
        { label: 'is greater than', value: '$gt' },
        { label: 'is greater than or equal to', value: '$gte' },
        { label: 'is less than or equal to', value: '$lte' },
        { label: 'is less than or equal to', value: '$lte' },
      ];
    }
    case 'time': {
      return [
        { label: 'contains', value: '$contains' },
        { label: 'is greater than', value: '$gt' },
        { label: 'is greater than or equal to', value: '$gte' },
        { label: 'is less than or equal to', value: '$lte' },
        { label: 'is less than or equal to', value: '$lte' },
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
