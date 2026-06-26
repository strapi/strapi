import * as ts from 'typescript';
import { pipe, values, sortBy, map } from 'lodash/fp';

import { models } from '../common';
import { emitDefinitions, format, generateSharedExtensionDefinition } from '../utils';
import type { GeneratorOptions } from '../utils';

const { factory } = ts;

const NO_COMPONENT_PLACEHOLDER_COMMENT = `/*
 * The app doesn't have any components yet.
 */
`;

/**
 * Generate type definitions for Strapi Components
 */
export const generateComponentsDefinitions = async (
  options: GeneratorOptions = {} as GeneratorOptions
) => {
  const { strapi } = options;

  const { components } = strapi;

  const componentsDefinitions = pipe(
    values,
    sortBy('uid'),
    map((component: any) => ({
      uid: component.uid,
      definition: models.schema.generateSchemaDefinition(component),
    }))
  )(components);

  options.logger.debug(`Found ${componentsDefinitions.length} components.`);

  if (componentsDefinitions.length === 0) {
    return { output: NO_COMPONENT_PLACEHOLDER_COMMENT, stats: {} };
  }

  const formattedSchemasDefinitions = componentsDefinitions.reduce<any[]>((acc, def) => {
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
