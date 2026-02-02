'use strict';

const { factory } = require('typescript');
const { values, pipe, map, sortBy } = require('lodash/fp');

const { models } = require('../common');
const { emitDefinitions, format, generateSharedExtensionDefinition } = require('../utils');

const NO_CONTENT_TYPE_PLACEHOLDER_COMMENT = `/*
 * The app doesn't have any content-types yet.
 */
`;

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

  const contentTypesDefinitions = pipe(
    values,
    sortBy('uid'),
    map((contentType) => ({
      uid: contentType.uid,
      definition: models.schema.generateSchemaDefinition(contentType),
    }))
  )(contentTypes);

  options.logger.debug(`Found ${contentTypesDefinitions.length} content-types.`);

  if (contentTypesDefinitions.length === 0) {
    return { output: NO_CONTENT_TYPE_PLACEHOLDER_COMMENT, stats: {} };
  }

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
