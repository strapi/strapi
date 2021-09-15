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
    case 'enum': {
      return [
        { label: 'is', value: '$eq' },
        { label: 'is not', value: '$ne' },
        // { label: 'not contains', value: '$not_$contains' },
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
