import { RegisterArg } from './../../../../types/registerFunctions.d';
import { ContentType } from '../../../../types/schema';

const registerEnumsDefinition = (
  contentType: ContentType,
  { registry, strapi, builders }: RegisterArg
) => {
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

export { registerEnumsDefinition };
