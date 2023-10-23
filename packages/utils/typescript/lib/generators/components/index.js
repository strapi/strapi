'use strict';

const { factory } = require('typescript');

const { models } = require('../common');
const { emitDefinitions, format, generateSharedExtensionDefinition } = require('../utils');

/**
 * Generate type definitions for Strapi Components
 *
 * @param {object} [options]
 * @param {object} options.strapi
 * @param {object} options.logger
 * @param {string} options.pwd
 */
const generateComponentsDefinitions = async (options = {}) => {
  const { strapi } = options;

  const { components } = strapi;

  const componentsDefinitions = Object.values(components).map((contentType) => ({
    uid: contentType.uid,
    definition: models.schema.generateSchemaDefinition(contentType),
  }));

  const formattedSchemasDefinitions = componentsDefinitions.reduce((acc, def) => {
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
    generateSharedExtensionDefinition('Components', componentsDefinitions),
  ];

  const output = emitDefinitions(allDefinitions);
  const formattedOutput = await format(output);

  return { output: formattedOutput, stats: {} };
};

module.exports = generateComponentsDefinitions;
