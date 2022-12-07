import { RegisterArg } from './../../../types/registerFunctions.d';
import { ContentType } from '../../../types/schema';
import { builder } from '../../builders/pothosBuilder';

const registerPolymorphicContentType = (
  contentType: ContentType,
  { registry, strapi }: RegisterArg
) => {
  const { service: getService } = strapi.plugin('graphql');

  const {
    naming,
    attributes: { isMorphRelation },
  } = getService('utils');
  const { KINDS, ERROR_TYPE_NAME } = getService('constants');

  const { attributes = {} } = contentType;

  // Isolate its polymorphic attributes
  const morphAttributes = Object.entries(attributes).filter(([, attribute]) =>
    isMorphRelation(attribute)
  );

  // For each one of those polymorphic attribute
  for (const [attributeName, attribute] of morphAttributes) {
    const name = naming.getMorphRelationTypeName(contentType, attributeName);
    const { target } = attribute;

    // Ignore those whose target is not an array
    if (!Array.isArray(target)) {
      continue;
    }

    // Transform target UIDs into types names
    const members = target
      // Get content types definitions
      .map((uid) => strapi.getModel(uid))
      // Resolve types names
      .map((contentType) => naming.getTypeName(contentType));

    // Register the new polymorphic union type
    registry.register(
      name,
      builder.unionType(name, {
        types: [...members, ERROR_TYPE_NAME],
        resolveType(obj) {
          const contentType = strapi.getModel(obj.__type);

          if (!contentType) {
            return null;
          }

          if (contentType.modelType === 'component') {
            return naming.getComponentName(contentType);
          }

          return naming.getTypeName(contentType);
        },
      }),

      { kind: KINDS.morph, contentType, attributeName }
    );
  }
};

export { registerPolymorphicContentType };
