import * as ts from 'typescript';
import { sortBy } from 'lodash';

import { models } from '../common';
import { resolveInterfaceNames } from '../common/interface-names';
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
  const { strapi, strict = false } = options;

  const { contentTypes } = strapi;

  const schemas = sortBy(Object.values<models.utils.Schema>(contentTypes ?? {}), 'uid');
  const interfaceNames = resolveInterfaceNames(
    schemas.map(({ uid }) => uid),
    options.logger,
    { strict }
  );
  const contentTypesDefinitions = schemas.map((contentType) => ({
    uid: contentType.uid,
    definition: models.schema.generateSchemaDefinition(
      contentType,
      interfaceNames.get(contentType.uid)
    ),
  }));

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
    generateSharedExtensionDefinition('ContentTypeSchemas', contentTypesDefinitions, { strict }),
  ];

  const output = emitDefinitions(allDefinitions);
  const formattedOutput = await format(output);

  return { output: formattedOutput, stats: {} };
};
