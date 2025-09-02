import get from 'lodash/get';

import type { PreviewContextValue } from '../pages/Preview';
import type { Schema } from '@strapi/types';

// Helper function to parse path with array indices and return clean attribute names
export const parsePathWithIndices = (path: string): string[] => {
  // Split by dots, then remove array indices from each part
  // e.g., "components[4].field.relations[2].name" → ["components", "field", "relations", "name"]
  return path.split('.').map((part) => part.replace(/\[\d+\]/g, ''));
};

// Helper function to resolve schema for a given path
export const getAttributeSchema = ({
  pathParts,
  schema,
  components,
}: {
  pathParts: string[];
  schema: PreviewContextValue['schema'] | PreviewContextValue['components'][string];
  components: PreviewContextValue['components'];
}): Schema.Attribute.AnyAttribute | null => {
  if (pathParts.length === 0) return null;

  if (pathParts.length === 1) {
    // Direct attribute on the current schema
    return schema.attributes[pathParts[0]];
  }

  const [currentPart, ...remainingParts] = pathParts;
  const currentAttribute = schema.attributes[currentPart];

  if (!currentAttribute) return null;

  // Handle different attribute types that can contain nested schemas
  if ('component' in currentAttribute) {
    // Component attribute
    const componentSchema = get(components, currentAttribute.component);
    if (!componentSchema) return null;
    return getAttributeSchema({ pathParts: remainingParts, schema: componentSchema, components });
  }

  // TODO: handle dynamic zones

  if ('target' in currentAttribute) {
    // Relation attribute - in this context we might not have access to the target schema
    // For now, we'll return the current attribute as it represents the relation itself
    if (remainingParts.length === 0) {
      return currentAttribute;
    }
  }

  return null;
};
