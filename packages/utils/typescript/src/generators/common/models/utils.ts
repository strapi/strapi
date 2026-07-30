import * as ts from 'typescript';
import {
  pipe,
  replace,
  camelCase,
  upperFirst,
  isUndefined,
  isNull,
  isString,
  isNumber,
  isDate,
  isArray,
  isBoolean,
  propEq,
} from 'lodash/fp';

const { factory } = ts;

export const NAMESPACES = {
  Struct: 'Struct',
  Schema: 'Schema',
};

/**
 * Shallow representation of a content-type/component attribute definition.
 * Only the fields read by the generators are typed; the rest is left open.
 */
export interface Attribute {
  type: string;
  [key: string]: any;
}

/**
 * Shallow representation of a content-type/component schema definition.
 * Only the fields read by the generators are typed; the rest is left open.
 */
export interface Schema {
  uid: string;
  modelType?: string;
  kind?: string;
  attributes: Record<string, Attribute>;
  [key: string]: any;
}

/**
 * Extract a valid interface name from a schema uid
 */
export const getSchemaInterfaceName = pipe(replace(/(:.)/, ' '), camelCase, upperFirst) as (
  uid: string
) => string;

export const getSchemaModelType = (schema: Schema): string | null | undefined => {
  const { modelType, kind } = schema;

  // Components
  if (modelType === 'component') {
    return 'component';
  }

  // Content-Types
  if (modelType === 'contentType') {
    return kind;
  }

  return null;
};

/**
 * Get the parent type name to extend based on the schema's nature
 */
export const getSchemaExtendsTypeName = (schema: Schema): string | null => {
  const base = getSchemaModelType(schema);

  if (base === null) {
    return null;
  }

  return `${NAMESPACES.Struct}.${upperFirst(base as string)}Schema`;
};

/**
 * Get a type node based on a type and its params
 */
export const getTypeNode = (typeName: string, params: ts.TypeNode[] = []): ts.TypeReferenceNode => {
  return factory.createTypeReferenceNode(factory.createIdentifier(typeName), params);
};

/**
 * Transform a regular JavaScript object or scalar value into a literal expression
 */
export const toTypeLiteral = (data: any): any => {
  if (isUndefined(data)) {
    return factory.createLiteralTypeNode(ts.SyntaxKind.UndefinedKeyword as any);
  }

  if (isNull(data)) {
    return factory.createLiteralTypeNode(ts.SyntaxKind.NullKeyword as any);
  }

  if (isString(data)) {
    return factory.createStringLiteral(data, true);
  }

  if (isNumber(data)) {
    return data < 0
      ? factory.createPrefixUnaryExpression(
          ts.SyntaxKind.MinusToken,
          factory.createNumericLiteral(-data)
        )
      : factory.createNumericLiteral(data);
  }

  if (isBoolean(data)) {
    return data ? factory.createTrue() : factory.createFalse();
  }

  if (isArray(data)) {
    return factory.createTupleTypeNode(data.map((item) => toTypeLiteral(item)));
  }

  if (isDate(data)) {
    return factory.createStringLiteral(data.toISOString());
  }

  if (typeof data !== 'object') {
    throw new Error(`Cannot convert to object literal. Unknown type "${typeof data}"`);
  }

  const entries = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]));

  const props = entries.reduce<any[]>((acc, [key, value]) => {
    // Handle keys such as content-type-builder & co.
    const identifier = key.includes('-')
      ? factory.createStringLiteral(key, true)
      : factory.createIdentifier(key);

    return [
      ...acc,
      factory.createPropertyDeclaration(
        undefined,
        identifier,
        undefined,
        toTypeLiteral(value),
        undefined
      ),
    ];
  }, []);

  return factory.createTypeLiteralNode(props);
};

/**
 * Get the number of attributes generated for a given schema definition
 */
export const getDefinitionAttributesCount = (
  definition: ts.InterfaceDeclaration
): number | null => {
  const attributesNode = definition.members.find(
    (propEq as any)('name.escapedText', 'attributes')
  ) as any;

  if (!attributesNode) {
    return null;
  }

  return attributesNode.type.members.length;
};

/**
 * Add the Schema.Attribute namespace before the typename
 */
export const withAttributeNamespace = (typeName: string): string =>
  `${NAMESPACES.Schema}.Attribute.${typeName}`;

/**
 * Add the schema namespace before the typename
 */
export const withSchemaNamespace = (typeName: string): string =>
  `${(NAMESPACES as any).schema}.${typeName}`;
