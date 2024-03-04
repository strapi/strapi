'use strict';

const ts = require('typescript');
const { factory } = require('typescript');
const {
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
} = require('lodash/fp');

const NAMESPACES = {
  Struct: 'Struct',
  Schema: 'Schema',
};

/**
 * Extract a valid interface name from a schema uid
 *
 * @param {string} uid
 * @returns {string}
 */
const getSchemaInterfaceName = pipe(replace(/(:.)/, ' '), camelCase, upperFirst);

const getSchemaModelType = (schema) => {
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
 *
 * @param {object} schema
 * @returns {string|null}
 */
const getSchemaExtendsTypeName = (schema) => {
  const base = getSchemaModelType(schema);

  if (base === null) {
    return null;
  }

  return `${NAMESPACES.Struct}.${upperFirst(base)}Schema`;
};

/**
 * Get a type node based on a type and its params
 *
 * @param {string} typeName
 * @param {ts.TypeNode[]} [params]
 * @returns
 */
const getTypeNode = (typeName, params = []) => {
  return factory.createTypeReferenceNode(factory.createIdentifier(typeName), params);
};

/**
 * Transform a regular JavaScript object or scalar value into a literal expression
 * @param data
 * @returns {ts.TypeNode}
 */
const toTypeLiteral = (data) => {
  if (isUndefined(data)) {
    return factory.createLiteralTypeNode(ts.SyntaxKind.UndefinedKeyword);
  }

  if (isNull(data)) {
    return factory.createLiteralTypeNode(ts.SyntaxKind.NullKeyword);
  }

  if (isString(data)) {
    return factory.createStringLiteral(data, true);
  }

  if (isNumber(data)) {
    return factory.createNumericLiteral(data);
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

  const entries = Object.entries(data);

  const props = entries.reduce((acc, [key, value]) => {
    // Handle keys such as content-type-builder & co.
    const identifier = key.includes('-')
      ? factory.createStringLiteral(key, true)
      : factory.createIdentifier(key);

    return [
      ...acc,
      factory.createPropertyDeclaration(undefined, identifier, undefined, toTypeLiteral(value)),
    ];
  }, []);

  return factory.createTypeLiteralNode(props);
};

/**
 * Get the number of attributes generated for a given schema definition
 *
 * @param {ts.TypeNode} definition
 * @returns {number | null}
 */
const getDefinitionAttributesCount = (definition) => {
  const attributesNode = definition.members.find(propEq('name.escapedText', 'attributes'));

  if (!attributesNode) {
    return null;
  }

  return attributesNode.type.members.length;
};

/**
 * Add the Schema.Attribute namespace before the typename
 *
 * @param {string} typeName
 * @returns {string}
 */
const withAttributeNamespace = (typeName) => `${NAMESPACES.Schema}.Attribute.${typeName}`;

/**
 * Add the schema namespace before the typename
 *
 * @param {string} typeName
 * @returns {string}
 */
const withSchemaNamespace = (typeName) => `${NAMESPACES.schema}.${typeName}`;

module.exports = {
  NAMESPACES,
  withAttributeNamespace,
  withSchemaNamespace,
  getSchemaInterfaceName,
  getSchemaExtendsTypeName,
  getSchemaModelType,
  getDefinitionAttributesCount,
  getTypeNode,
  toTypeLiteral,
};
