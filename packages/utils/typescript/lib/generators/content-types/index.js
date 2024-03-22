'use strict';

const { factory } = require('typescript');

const { models } = require('../common');
const { emitDefinitions, format, generateSharedExtensionDefinition } = require('../utils');

/**
 * Generate type definitions for Strapi Content-Types
 *
 * @param {object} [options]
 * @param {object} options.strapi
 * @param {object} options.logger
 * @param {string} options.pwd
 */
const generateContentTypesDefinitions = async (options = {}) => {
  const { strapi } = options;

  const { contentTypes } = strapi;

  const contentTypesDefinitions = Object.values(contentTypes).map((contentType) => ({
    uid: contentType.uid,
    definition: models.schema.generateSchemaDefinition(contentType),
  }));

  const formattedSchemasDefinitions = contentTypesDefinitions.reduce((acc, def) => {
    acc.push(
      // Definition
      def.definition,

      // Add a newline between each interface declaration
      factory.createIdentifier('\n')
    );

    return acc;
  }, []);

  const allDefinitions = [
    // Imports
    ...models.imports.generateImportDefinition(),

    // Add a newline after the import statement
    factory.createIdentifier('\n'),

    // Schemas
    ...formattedSchemasDefinitions,

    // Global
    generateSharedExtensionDefinition('ContentTypeSchemas', contentTypesDefinitions),
  ];

  const output = emitDefinitions(allDefinitions);
  const formattedOutput = await format(output);

  return { output: formattedOutput, stats: {} };
};

module.exports = generateContentTypesDefinitions;
