'use strict';

const registerEnumsDefinition = (contentType, { registry, strapi, builders }) => {
  const { service: getService } = strapi.plugin('graphql');

  const {
    naming,
    attributes: { isEnumeration },
  } = getService('utils');
  const { KINDS } = getService('constants');

  const { attributes } = contentType;

  const enumAttributes = Object.keys(attributes).filter((attributeName) =>
    isEnumeration(attributes[attributeName])
  );

  for (const attributeName of enumAttributes) {
    const attribute = attributes[attributeName];

    const enumName = naming.getEnumName(contentType, attributeName);
    const enumDefinition = builders.buildEnumTypeDefinition(attribute, enumName);

    registry.register(enumName, enumDefinition, {
      kind: KINDS.enum,
      contentType,
      attributeName,
      attribute,
    });
  }
};

module.exports = { registerEnumsDefinition };
