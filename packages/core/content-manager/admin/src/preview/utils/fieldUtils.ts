import { type FieldContentSourceMap } from '@strapi/admin/strapi-admin';

import type { PREVIEW_ERROR_MESSAGES } from './constants';
import type { PreviewContextValue } from '../pages/Preview';
import type { Modules, Schema, Struct, UID } from '@strapi/types';

type PreviewErrorMessage = keyof typeof PREVIEW_ERROR_MESSAGES;

// Generic error class for preview field operations
export class PreviewFieldError extends Error {
  public readonly messageKey: PreviewErrorMessage;

  constructor(messageKey: PreviewErrorMessage) {
    super(messageKey);
    this.name = 'PreviewFieldError';
    this.messageKey = messageKey;
  }
}

type PathPart = { name: string; index?: number };

// Helper function to parse path with array indices and return clean attribute names
export const parsePathWithIndices = (path: string): PathPart[] => {
  // Split by dots, then parse array indices from each part. For example:
  // input "components.4.field.relations.2.name"
  // output [{name: "components", index: 4}, {name: "field"}, {name: "relations", index: 2}, {name: "name"}]
  return path
    .split('.')
    .map((part) => {
      const numericIndex = parseInt(part, 10);
      if (!isNaN(numericIndex) && part === numericIndex.toString()) {
        // This part is a pure numeric index, return it as an index for the previous part
        return { name: '', index: numericIndex };
      }
      return { name: part };
    })
    .reduce((acc: PathPart[], part) => {
      if (part.name === '' && part.index !== undefined) {
        // This is an index, attach it to the previous part
        if (acc.length > 0) {
          acc[acc.length - 1].index = part.index;
        }
      } else {
        acc.push(part);
      }
      return acc;
    }, []);
};

export interface FieldAncestor {
  attribute: Schema.Attribute.AnyAttribute;
  path: string;
  pathParts: PathPart[];
}

export function getFieldAncestors({
  path,
  schema,
  components,
  document,
}: {
  path: string;
  schema: PreviewContextValue['schema'] | PreviewContextValue['components'][string];
  components: PreviewContextValue['components'];
  document: Modules.Documents.AnyDocument;
}): FieldAncestor[] {
  const pathParts = parsePathWithIndices(path);
  const ancestors: FieldAncestor[] = [];

  const visitor = (
    remainingPathParts: PathPart[],
    currentAttributes: Schema.Attributes,
    currentData: unknown,
    currentPath: PathPart[] = []
  ): void => {
    const [currentPart, ...restParts] = remainingPathParts;

    if (!currentPart) {
      return;
    }

    const currentAttribute = currentAttributes[currentPart.name];

    if (!currentAttribute) {
      throw new PreviewFieldError('INVALID_FIELD_PATH');
    }

    if (currentAttribute.type === 'relation') {
      throw new PreviewFieldError('RELATIONS_NOT_HANDLED');
    }

    const currentFullPath = [...currentPath, currentPart];
    ancestors.push({
      attribute: currentAttribute,
      path: stringifyPathParts(currentFullPath),
      pathParts: currentFullPath,
    });

    if (currentAttribute.type === 'component') {
      const componentAttributes = components[currentAttribute.component].attributes;
      if (currentAttribute.repeatable) {
        if (currentPart.index === undefined) {
          throw new PreviewFieldError('INVALID_FIELD_PATH');
        }
        visitor(
          restParts,
          componentAttributes,
          (currentData as any)[currentPart.name][currentPart.index],
          currentFullPath
        );
      } else {
        visitor(
          restParts,
          componentAttributes,
          (currentData as any)[currentPart.name],
          currentFullPath
        );
      }
    } else if (currentAttribute.type === 'dynamiczone') {
      if (currentPart.index === undefined) {
        throw new PreviewFieldError('INVALID_FIELD_PATH');
      }

      const componentData = (currentData as any)[currentPart.name][currentPart.index];
      const componentAttributes = components[componentData.__component].attributes;
      visitor(restParts, componentAttributes, componentData, currentFullPath);
    }
  };

  visitor(pathParts, schema.attributes, document);
  return ancestors;
}

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
  const ancestors = getFieldAncestors({ path, schema, components, document });
  return ancestors[ancestors.length - 1].attribute;
}

export const stringifyPathParts = (pathParts: PathPart[]): string => {
  return pathParts
    .map((part) => {
      if (part.index !== undefined) {
        return `${part.name}.${part.index}`;
      }
      return part.name;
    })
    .join('.');
};

export function parseFieldMetaData(strapiSource: string): FieldContentSourceMap | null {
  const searchParams = new URLSearchParams(strapiSource);
  const path = searchParams.get('path');
  const type = searchParams.get('type');
  const documentId = searchParams.get('documentId');
  const locale = searchParams.get('locale');
  const model = searchParams.get('model');
  const kind = searchParams.get('kind');

  if (!path || !type || !documentId || !model) {
    return null;
  }

  return {
    path,
    type: type as Schema.Attribute.AnyAttribute['type'],
    documentId,
    locale: locale ?? null,
    model: model as UID.Schema | undefined,
    kind: kind ? (kind as Struct.ContentTypeKind) : undefined,
  };
}
