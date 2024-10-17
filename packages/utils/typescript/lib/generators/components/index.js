'use strict';

const { factory } = require('typescript');
const { pipe, values, sortBy, map } = require('lodash/fp');

const { models } = require('../common');
const { emitDefinitions, format, generateSharedExtensionDefinition } = require('../utils');

const NO_COMPONENT_PLACEHOLDER_COMMENT = `/*
 * The app doesn't have any components yet.
 */
`;

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

  const componentsDefinitions = pipe(
    values,
    sortBy('uid'),
    map((component) => ({
      uid: component.uid,
      definition: models.schema.generateSchemaDefinition(component),
    }))
  )(components);

  options.logger.debug(`Found ${componentsDefinitions.length} components.`);

  if (componentsDefinitions.length === 0) {
    return { output: NO_COMPONENT_PLACEHOLDER_COMMENT, stats: {} };
  }

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
    generateSharedExtensionDefinition('ComponentSchemas', componentsDefinitions),
  ];

  const output = emitDefinitions(allDefinitions);
  const formattedOutput = await format(output);

  return { output: formattedOutput, stats: {} };
};

module.exports = generateComponentsDefinitions;
