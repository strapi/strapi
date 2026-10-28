import * as ts from 'typescript';
import { omit, sortBy } from 'lodash';

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
 * Attributes a package adds at register only when the license that verifies at boot lists a gate:
 * the stage and assignee relations of review workflows (`@strapi/review-workflows`,
 * `constants/workflows.ts`). The package declares them in
 * `Strapi.Registries.LicensedContentTypeAttributes`, and strict types add them from the
 * application's `typescript.licensedFeatures`, so strict generated schemas leave them out, whatever
 * the license type generation boots with. Application attributes cannot use these names: the
 * `strapi` prefix is reserved.
 */
const LICENSED_ATTRIBUTES = ['strapi_stage', 'strapi_assignee'];

const withoutLicensedAttributes = (schema: models.utils.Schema): models.utils.Schema => ({
  ...schema,
  attributes: omit(schema.attributes, LICENSED_ATTRIBUTES),
});

/**
 * Generate type definitions for Strapi Content-Types
 */
export const generateContentTypesDefinitions = async (
  options: GeneratorOptions = {} as GeneratorOptions
) => {
  const { strapi, strict = false } = options;

  const { contentTypes } = strapi;

  const runtimeSchemas = sortBy(Object.values<models.utils.Schema>(contentTypes ?? {}), 'uid');
  const schemas = strict === true ? runtimeSchemas.map(withoutLicensedAttributes) : runtimeSchemas;
  const interfaceNames = resolveInterfaceNames(
    schemas.map(({ uid }) => uid),
    options.logger,
    { strict }
  );
  const contentTypesDefinitions = schemas.map((contentType) => ({
    uid: contentType.uid,
    definition: models.schema.generateSchemaDefinition(
      contentType,
      interfaceNames.get(contentType.uid),
      { strict }
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

    // Global: strict mode reads the application's registry, which replaces package declarations
    generateSharedExtensionDefinition(
      strict === true ? 'AppContentTypeSchemas' : 'ContentTypeSchemas',
      contentTypesDefinitions,
      { strict }
    ),
  ];

  const output = emitDefinitions(allDefinitions);
  const formattedOutput = await format(output);

  return { output: formattedOutput, stats: {} };
};
