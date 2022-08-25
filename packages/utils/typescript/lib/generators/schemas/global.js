'use strict';

/* eslint-disable no-bitwise */

const ts = require('typescript');
const { factory } = require('typescript');

const { getSchemaInterfaceName } = require('./utils');

/**
 *
 * @param {object} schemaDefinition
 * @param {ts.InterfaceDeclaration} schemaDefinition.definition
 * @param {object} schemaDefinition.schema
 */
const schemaDefinitionToPropertySignature = ({ schema }) => {
  const { uid } = schema;

  const interfaceTypeName = getSchemaInterfaceName(uid);

  return factory.createPropertySignature(
    undefined,
    factory.createStringLiteral(uid, true),
    undefined,
    factory.createTypeReferenceNode(factory.createIdentifier(interfaceTypeName))
  );
};

/**
 * Generate the global module augmentation block
 *
 * @param {Array<{ schema: object; definition: ts.TypeNode }>} schemasDefinitions
 * @returns {ts.ModuleDeclaration}
 */
const generateGlobalDefinition = (schemasDefinitions = []) => {
  const properties = schemasDefinitions.map(schemaDefinitionToPropertySignature);

  return factory.createModuleDeclaration(
    undefined,
    [factory.createModifier(ts.SyntaxKind.DeclareKeyword)],
    factory.createIdentifier('@strapi/strapi/lib/types/core/schemas'),
    factory.createModuleBlock([
      factory.createInterfaceDeclaration(
        undefined,
        [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        factory.createIdentifier('Schemas'),
        undefined,
        undefined,
        properties
      ),
    ]),
    ts.NodeFlags.ExportContext |
      ts.NodeFlags.GlobalAugmentation |
      ts.NodeFlags.Ambient |
      ts.NodeFlags.ContextFlags
  );
};

module.exports = { generateGlobalDefinition };
