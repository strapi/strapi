import type { Struct, UID } from '@strapi/types';

/**
 * Throws when a dynamic zone references a component that is not registered.
 *
 * A dynamic zone is stored as a polymorphic relation without a target, so the database
 * metadata never checks its components (a `component` attribute fails at that step instead).
 * Without this check the app boots and every Document Service call on the schema fails.
 */
export const validateDynamicZoneComponents = (
  schemas: Array<Struct.ContentTypeSchema | Struct.ComponentSchema>,
  components: Record<UID.Component, Struct.ComponentSchema>
) => {
  for (const schema of schemas) {
    for (const [attributeName, attribute] of Object.entries(schema.attributes)) {
      if (attribute.type !== 'dynamiczone') {
        continue;
      }

      for (const componentUID of attribute.components) {
        if (components[componentUID] === undefined) {
          throw new Error(
            `Dynamic zone attribute "${attributeName}" of "${schema.uid}" references an unknown component: "${componentUID}"`
          );
        }
      }
    }
  }
};
