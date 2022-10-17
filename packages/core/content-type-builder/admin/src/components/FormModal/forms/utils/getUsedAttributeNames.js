/**
 *
 * @param {array} attributes The attributes found on the dataManager's modifiedData object
 * @param {object} schemaData The modifiedData and SchemaData objects from the reducer state
 * @returns A list of names already being used
 */
const getUsedAttributeNames = (attributes, schemaData) => {
  return attributes
    .filter(({ name }) => {
      return name !== schemaData.initialData.name;
    })
    .map(({ name }) => name);
};

export default getUsedAttributeNames;
