'use strict';

const registerDynamicZonesDefinition = (contentType, { registry, strapi, builders }) => {
  const { service: getService } = strapi.plugin('graphql');

  const {
    naming,
    attributes: { isDynamicZone },
  } = getService('utils');
  const { KINDS } = getService('constants');

  const { attributes } = contentType;

  const dynamicZoneAttributes = Object.keys(attributes).filter(attributeName =>
    isDynamicZone(attributes[attributeName])
  );

  for (const attributeName of dynamicZoneAttributes) {
    const attribute = attributes[attributeName];
    const dzName = naming.getDynamicZoneName(contentType, attributeName);
    const dzInputName = naming.getDynamicZoneInputName(contentType, attributeName);

    const [type, input] = builders.buildDynamicZoneDefinition(attribute, dzName, dzInputName);

    const baseConfig = {
      contentType,
      attributeName,
      attribute,
    };

    registry.register(dzName, type, { kind: KINDS.dynamicZone, ...baseConfig });
    registry.register(dzInputName, input, { kind: KINDS.input, ...baseConfig });
  }
};

module.exports = { registerDynamicZonesDefinition };
