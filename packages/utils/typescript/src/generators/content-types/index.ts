import * as ts from 'typescript';
import { values, pipe, map, sortBy } from 'lodash/fp';

import { models } from '../common';
import { emitDefinitions, format, generateSharedExtensionDefinition } from '../utils';
import type { GeneratorOptions } from '../utils';

const { factory } = ts;

const NO_CONTENT_TYPE_PLACEHOLDER_COMMENT = `/*
 * The app doesn't have any content-types yet.
 */
`;

/**
 * Generate type definitions for Strapi Content-Types
 */
export const generateContentTypesDefinitions = async (
  options: GeneratorOptions = {} as GeneratorOptions
) => {
  const { strapi } = options;

  const { contentTypes } = strapi;

  const contentTypesDefinitions = pipe(
    values,
    sortBy('uid'),
    map((contentType: any) => ({
      uid: contentType.uid,
      definition: models.schema.generateSchemaDefinition(contentType),
    }))
  )(contentTypes);

  options.logger.debug(`Found ${contentTypesDefinitions.length} content-types.`);

  if (contentTypesDefinitions.length === 0) {
    return { output: NO_CONTENT_TYPE_PLACEHOLDER_COMMENT, stats: {} };
  }

  const formattedSchemasDefinitions = contentTypesDefinitions.reduce<any[]>((acc, def) => {
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
