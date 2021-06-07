'use strict';

const { enumType } = require('nexus');
const { set } = require('lodash/fp');

const { utils } = require('../../types');

/**
 * Build a collection with all the enums definition from a content type's attributes
 * @param {object} contentType - The content type used to extract the enums definition
 * @return {Array<[string, NexusEnumTypeDef<string>]>}
 */
const buildContentTypeEnums = contentType => {
  const { attributes, modelName } = contentType;

  // Helper used to generate enum names based on the content-type & attribute's name
  const defaultEnumNameFor = attributeName => {
    return `ENUM_${modelName.toUpperCase()}_${attributeName.toUpperCase()}`;
  };

  // Method used to build a new GraphQL enum type definition from a config
  const buildEnumType = enumDefinition => {
    const { attributeName, config } = enumDefinition;

    const name = config.enumName || defaultEnumNameFor(attributeName);

    return [
      // Identifier of the enum
      name,
      // Nexus definition of the enum
      enumType({
        name,
        description: `Enum type for ${modelName} used by ${attributeName}`,
        members: config.enum.reduce((acc, value) => set(value, value, acc), {}),
      }),
    ];
  };

  // Retrieve all the enum definitions from the content-type's attributes
  return Object.keys(attributes)
    .filter(attributeName => utils.isEnumeration(attributes[attributeName]))
    .map(attributeName => ({ attributeName, config: attributes[attributeName] }))
    .map(buildEnumType);
};

/**
 * Build a map with all the enums definition from a content type's attributes
 * @param contentType
 * @return {{[p: string]: NexusEnumTypeDef<string>}}
 */
const buildContentTypeEnumsMap = contentType => {
  // Enums collection of format Array<[string, EnumDefinition]>
  const enums = buildContentTypeEnums(contentType);

  // Create an enum map from the entries
  return Object.fromEntries(enums);
};

module.exports = { buildContentTypeEnums, buildContentTypeEnumsMap };
