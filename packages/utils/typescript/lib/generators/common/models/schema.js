'use strict';

const ts = require('typescript');
const { factory } = require('typescript');
const { isEmpty } = require('lodash/fp');

const {
  getSchemaExtendsTypeName,
  getSchemaInterfaceName,
  toTypeLiteral,
  NAMESPACES,
} = require('./utils');
const attributeToPropertySignature = require('./attributes');
const { addImport } = require('../imports');

/**
 * Generate a property signature for the schema's `attributes` field
 *
 * @param {object} schema
 * @returns {ts.PropertySignature}
 */
const generateAttributePropertySignature = (schema) => {
  const { attributes } = schema;

  const properties = Object.entries(attributes).map(([attributeName, attribute]) => {
    return attributeToPropertySignature(schema, attributeName, attribute);
  });

  return factory.createPropertySignature(
    undefined,
    factory.createIdentifier('attributes'),
    undefined,
    factory.createTypeLiteralNode(properties)
  );
};

const generatePropertyLiteralDefinitionFactory = (schema) => (key) => {
  return factory.createPropertySignature(
    undefined,
    factory.createIdentifier(key),
    undefined,
    toTypeLiteral(schema[key])
  );
};

/**
 * Generate an interface declaration for a given schema
 *
 * @param {object} schema
 * @returns {ts.InterfaceDeclaration}
 */
const generateSchemaDefinition = (schema) => {
  const { uid } = schema;

  // Resolve the different interface names needed to declare the schema's interface
  const interfaceName = getSchemaInterfaceName(uid);
  const parentType = getSchemaExtendsTypeName(schema);

  // Make sure the Schema namespace is imported
  addImport(NAMESPACES.schema);

  // Properties whose values can be mapped to a literal type expression
  const literalPropertiesDefinitions = ['collectionName', 'info', 'options', 'pluginOptions']
    // Ignore non-existent or empty declarations
    .filter((key) => !isEmpty(schema[key]))
    // Generate literal definition for each property
    .map(generatePropertyLiteralDefinitionFactory(schema));

  // Generate the `attributes` literal type definition
  const attributesProp = generateAttributePropertySignature(schema);

  // Merge every schema's definition in a single list
  const schemaProperties = [...literalPropertiesDefinitions, attributesProp];

  // Generate the schema's interface declaration
  const schemaType = factory.createInterfaceDeclaration(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    factory.createIdentifier(interfaceName),
    undefined,
    [
      factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
        factory.createIdentifier(parentType),
      ]),
    ],
    schemaProperties
  );

  return schemaType;
};

module.exports = { generateSchemaDefinition };
