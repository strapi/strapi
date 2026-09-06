import * as ts from 'typescript';
import { isEmpty } from 'lodash/fp';

import {
  getSchemaExtendsTypeName,
  getSchemaInterfaceName,
  toTypeLiteral,
  NAMESPACES,
} from './utils';
import type { Schema } from './utils';
import { attributeToPropertySignature } from './attributes';
import { addImport } from '../imports';

const { factory } = ts;

/**
 * Generate a property signature for the schema's `attributes` field
 */
const generateAttributePropertySignature = (schema: Schema): ts.PropertySignature => {
  const { attributes } = schema;

  const properties = Object.entries(attributes)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([attributeName, attribute]) => {
      return attributeToPropertySignature(schema, attributeName, attribute);
    });

  return factory.createPropertySignature(
    undefined,
    factory.createIdentifier('attributes'),
    undefined,
    factory.createTypeLiteralNode(properties as any)
  );
};

const generatePropertyLiteralDefinitionFactory = (schema: Schema) => (key: string) => {
  return factory.createPropertySignature(
    undefined,
    factory.createIdentifier(key),
    undefined,
    toTypeLiteral(schema[key])
  );
};

/**
 * Generate an interface declaration for a given schema
 */
export const generateSchemaDefinition = (schema: Schema): ts.InterfaceDeclaration => {
  const { uid } = schema;

  // Resolve the different interface names needed to declare the schema's interface
  const interfaceName = getSchemaInterfaceName(uid);
  const parentType = getSchemaExtendsTypeName(schema);

  // Make sure the Struct namespace is imported
  addImport(NAMESPACES.Struct);

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
        factory.createIdentifier(parentType as string) as any,
      ]),
    ],
    schemaProperties
  );

  return schemaType;
};
