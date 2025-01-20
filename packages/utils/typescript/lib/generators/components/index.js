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
 * @param {Function} [filter] - Optional function to filter components
 * @param {Function} [transform] - Optional function to transform components
 */
const generateComponentsDefinitions = async (options = {}) => {
  const { strapi, filter, transform } = options;

  const { components } = strapi;

  // Apply filter and transform
  const filteredComponents = filter
    ? Object.entries(components).filter(([, component]) => filter(component))
    : Object.entries(components);

  const transformedComponents = transform
    ? filteredComponents.map(([uid, component]) => [uid, transform(component)])
    : filteredComponents;

  const componentsDefinitions = pipe(
    values,
    sortBy('uid'),
    map((component) => ({
      uid: component.uid,
      definition: models.schema.generateSchemaDefinition(component),
    }))
  )(Object.fromEntries(transformedComponents));

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
