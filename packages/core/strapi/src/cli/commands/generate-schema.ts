import { createCommand } from 'commander';
import { createStrapi, compileStrapi } from '@strapi/core';
import type { Struct } from '@strapi/types';

import * as fs from 'fs';
import tsUtils from '@strapi/typescript-utils';
import prettier from 'prettier';
import type { StrapiCommand } from '../types';

interface CmdOptions {
  silent?: boolean;
  outDir?: string;
  typesDir?: string;
}

// Filter to only include content types where the UID begins with "api::"
// TODO: temporary restriction to API content types
const restrictToApiContentTypes = (uid: string) => {
  let result;

  try {
    result = uid.startsWith('api::');
  } catch (e) {
    console.error('error', e);
  }

  return result;
};

const allCrudOperationNames = ['create', 'update', 'delete', 'findOne', 'find'];

const crudOperationNames = {
  collectionType: allCrudOperationNames,
  singleType: allCrudOperationNames.filter((op) => op !== 'find'),
};

const action = async ({ silent, outDir }: CmdOptions) => {
  if (silent) {
    console.log = () => {};
  }

  console.log('Generating schema.ts...');
  const outputDir = outDir ?? 'types';

  // Create and register a Strapi instance
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).register();

  // Generate types with modifications. The Modifications are:
  // - Filter out content types that are not API content types
  // - Filter out attributes that are private or password
  await tsUtils.generators.generate({
    strapi: app,
    pwd: appContext.appDir,
    rootDir: outputDir,
    logger: {
      silent,
    },
    artifacts: {
      contentTypes: true,
      components: true,
    },
    filters: {
      contentTypes(contentType: Struct.CollectionTypeSchema) {
        return restrictToApiContentTypes(contentType.uid);
      },
    },
    transforms: {
      contentTypes(contentType: Struct.CollectionTypeSchema) {
        // Strip private attributes
        const attributes = Object.fromEntries(
          Object.entries(contentType.attributes).filter(([, attr]) => {
            return (
              attr.type !== 'password' &&
              // @ts-expect-error TODO: fix this
              !attr.private
            );
          })
        );
        return { ...contentType, attributes };
      },
    },
  });

  const contentTypes = app.get('content-types').getAll();
  const apiContentTypes: [string, Struct.CollectionTypeSchema | Struct.SingleTypeSchema][] =
    Object.entries(contentTypes).filter(([uid]) => restrictToApiContentTypes(uid)) as [
      string,
      Struct.CollectionTypeSchema | Struct.SingleTypeSchema,
    ][];

  // Generate a single import statement for generated types
  const uidToGeneratedTypeName = new Map<string, string>();
  const allTypeNames = apiContentTypes.map(
    ([uid, contentType]: [string, Struct.CollectionTypeSchema | Struct.SingleTypeSchema]) => {
      const {
        info: { singularName },
      } = contentType;

      const formattedSingularName = singularName
        .split('-')
        .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');

      const typeName = `Api${formattedSingularName}${formattedSingularName}`;
      uidToGeneratedTypeName.set(uid, typeName);

      return typeName;
    }
  );
  const combinedImportStatement = `import { ${allTypeNames.join(', ')} } from './generated/contentTypes';`;

  // Helper function to generate TypeScript interface definitions
  const generateInterfaceDefinition = (
    uid: string,
    contentType: Struct.CollectionTypeSchema | Struct.SingleTypeSchema,
    operations: string[],
    uidToGeneratedTypeName: Map<string, string>
  ) => {
    const {
      info: { singularName, pluralName },
      kind,
    } = contentType;

    const typeName = uidToGeneratedTypeName.get(uid);
    const operationsDefinition = operations
      .map((op: string) => `${op}(): Promise<${typeName}>;`)
      .join('\n');

    const interfaceNameForCrudTypes = (
      kind === 'collectionType' ? pluralName : singularName
    ).replace(/-/g, '');

    return `interface ${interfaceNameForCrudTypes} {\n${operationsDefinition}\n}`;
  };

  // Generate TypeScript definitions for CRUD operations
  const collectionTypeDefinitions = apiContentTypes
    .filter(([, contentType]) => contentType.kind === 'collectionType')
    .map(([uid, contentType]) =>
      generateInterfaceDefinition(
        uid,
        contentType,
        crudOperationNames.collectionType,
        uidToGeneratedTypeName
      )
    )
    .join('\n\n');

  const singleTypeDefinitions = apiContentTypes
    .filter(([, contentType]) => contentType.kind === 'singleType')
    .map(([uid, contentType]) =>
      generateInterfaceDefinition(
        uid,
        contentType,
        crudOperationNames.singleType,
        uidToGeneratedTypeName
      )
    )
    .join('\n\n');

  // Combine the sections into 'CollectionTypes' and 'SingleTypes' interfaces
  const schemaDefinitions = `
    ${collectionTypeDefinitions}\n\n
    ${singleTypeDefinitions}\n\n
    export interface CollectionTypes {\n${apiContentTypes
      .filter(([, contentType]) => contentType.kind === 'collectionType')
      .map(
        ([, contentType]) =>
          `${contentType.info.pluralName.replace(/-/g, '')}: ${contentType.info.pluralName.replace(/-/g, '')}`
      )
      .join(';\n')}\n}\n\n
    export interface SingleTypes {\n${apiContentTypes
      .filter(([, contentType]) => contentType.kind === 'singleType')
      .map(
        ([, contentType]) =>
          `${contentType.info.singularName.replace(/-/g, '')}: ${contentType.info.singularName.replace(/-/g, '')}`
      )
      .join(';\n')}\n}
  `;

  // Determine output directory
  const outputPath = `${outputDir}/schema.ts`;

  const formattedOutput = await prettier.format(
    `${combinedImportStatement}\n\n${schemaDefinitions}`,
    {
      parser: 'typescript',
      singleQuote: true,
      trailingComma: 'all',
    }
  );

  fs.mkdirSync(outputDir, { recursive: true }); // Ensure the /types directory exists
  fs.writeFileSync(outputPath, formattedOutput);

  console.log('Successfully generated schema.ts');
  await app.destroy();
};

/**
 * `$ strapi content-api:generate`
 */
const command: StrapiCommand = () => {
  return createCommand('content-api:generate')
    .description('Generate a TypeScript schema file for the content API')
    .option('-s, --silent', 'Run the generation silently, without any output', false)
    .option(
      '-o, --out-dir <outDir>',
      'Specify a relative root directory for the generated schema.ts. You can use this to generate the schema.ts in the directory of your project that uses @strapi/sdk-js'
    )
    .action(action);
};

export { action, command };
