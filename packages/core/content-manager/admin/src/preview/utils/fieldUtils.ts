import { type FieldContentSourceMap } from '@strapi/admin/strapi-admin';

import type { PreviewContextValue } from '../pages/Preview';
import type { Modules, Schema, Struct, UID } from '@strapi/types';

type PathPart = { name: string; index?: number };

// Helper function to parse path with array indices and return clean attribute names
export const parsePathWithIndices = (path: string): PathPart[] => {
  // Split by dots, then remove array indices from each part. For example:
  // input "components[4].field.relations[2].name"
  // output [{name: "components", index: 4}, {name: "field"}, {name: "relations", index: 2}, {name: "name"}]
  return path.split('.').map((part) => {
    const match = part.match(/(\w+)\[(\d+)\]/);
    if (match) {
      return { name: match[1], index: parseInt(match[2], 10) };
    }
    return { name: part };
  });
};

export function getAttributeSchemaFromPath({
  path,
  schema,
  components,
  document,
}: {
  path: string;
  schema: PreviewContextValue['schema'] | PreviewContextValue['components'][string];
  components: PreviewContextValue['components'];
  document: Modules.Documents.AnyDocument;
}): Schema.Attribute.AnyAttribute {
  /**
   * Create the function that will be recursively called.
   * We don't do recursion on getAttributeSchemaFromPath itself because:
   * - it takes a path string, not the parsed array that's better for recursion
   * - even when several levels deep, we still need access to the root schema and components
   */
  const visitor = (
    currentPathParts: PathPart[],
    currentAttributes: Schema.Attributes,
    currentData: any
  ): Schema.Attribute.AnyAttribute => {
    const [currentPart, ...remainingParts] = currentPathParts;

    // Get the data and schema for the current path
    const currentAttribute = currentAttributes[currentPart.name];

    if (!currentAttribute) {
      throw new Error('Invalid field path');
    }

    if (currentAttribute.type === 'relation') {
      throw new Error('Relations not handled');
    }

    if (currentAttribute.type === 'component') {
      const componentAttributes = components[currentAttribute.component].attributes;
      if (currentAttribute.repeatable) {
        // We must have the index, otherwise we don't know what data to use
        if (currentPart.index === undefined) {
          throw new Error('Invalid field path');
        }
        return visitor(
          remainingParts,
          componentAttributes,
          currentData[currentPart.name][currentPart.index]
        );
      }

      // Non repeatable component
      return visitor(remainingParts, componentAttributes, currentData[currentPart.name]);
    }

    if (currentAttribute.type === 'dynamiczone') {
      // We must have the index, otherwise we don't know what component we're dealing with
      if (currentPart.index === undefined) {
        throw new Error('Invalid field path');
      }

      const componentData = currentData[currentPart.name][currentPart.index];
      const componentAttributes = components[componentData.__component].attributes;
      return visitor(remainingParts, componentAttributes, componentData);
    }

    // Plain regular field. It ends the recursion
    return currentAttributes[currentPart.name];
  };

  return visitor(parsePathWithIndices(path), schema.attributes, document);
}

export function parseFieldMetaData(strapiSource: string): FieldContentSourceMap | null {
  const url = new URL(strapiSource);
  const path = url.searchParams.get('path');
  const type = url.searchParams.get('type');
  const documentId = url.searchParams.get('documentId');
  const locale = url.searchParams.get('locale');
  const model = url.searchParams.get('model');
  const kind = url.searchParams.get('kind');

  if (!path || !type || !documentId || !model) {
    return null;
  }

  return {
    path,
    type: type as Schema.Attribute.AnyAttribute['type'],
    documentId,
    locale: locale ?? null,
    model: model as UID.Schema | undefined,
    kind: kind as Struct.ContentTypeKind | undefined,
  };
}
