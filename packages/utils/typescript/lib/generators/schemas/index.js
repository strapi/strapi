'use strict';

const path = require('path');

const ts = require('typescript');
const { factory } = require('typescript');

const fp = require('lodash/fp');
const fse = require('fs-extra');
const prettier = require('prettier');
const chalk = require('chalk');
const CLITable = require('cli-table3');

const { generateImportDefinition } = require('./imports');
const { generateSchemaDefinition } = require('./schema');
const { generateGlobalDefinition } = require('./global');
const {
  getAllStrapiSchemas,
  getSchemaInterfaceName,
  getSchemaModelType,
  getDefinitionAttributesCount,
} = require('./utils');

const DEFAULT_OUT_FILENAME = 'schemas.d.ts';

/**
 * Generate type definitions for Strapi schemas
 *
 * @param {object} options
 * @param {Strapi} options.strapi
 * @param {{ distDir: string; appDir: string; }} options.dirs
 * @param {string} [options.outDir]
 * @param {string} [options.file]
 * @param {boolean} [options.verbose]
 */
const generateSchemasDefinitions = async (options = {}) => {
  const { strapi, outDir = process.cwd(), file = DEFAULT_OUT_FILENAME, verbose = false } = options;

  const schemas = getAllStrapiSchemas(strapi);

  const schemasDefinitions = Object.values(schemas).map(schema => ({
    schema,
    definition: generateSchemaDefinition(schema),
  }));

  const allDefinitions = [
    // Imports
    generateImportDefinition(),

    // Add a newline after the import statement
    factory.createIdentifier('\n'),

    // Schemas
    ...schemasDefinitions.reduce(
      (acc, def) => [
        ...acc,
        def.definition,
        // Add a newline between each interface declaration
        factory.createIdentifier('\n'),
      ],
      []
    ),

    // Global
    generateGlobalDefinition(schemasDefinitions),
  ];

  const output = emitDefinitions(allDefinitions);
  const formattedOutput = await format(output);

  const definitionFilepath = await saveDefinitionToFileSystem(outDir, file, formattedOutput);

  if (verbose) {
    logDebugInformation(schemasDefinitions, { filepath: definitionFilepath });
  }
};

const emitDefinitions = definitions => {
  const nodeArray = factory.createNodeArray(definitions);

  const sourceFile = ts.createSourceFile(
    'placeholder.ts',
    '',
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TS
  );

  const printer = ts.createPrinter({ newLine: true, omitTrailingSemicolon: true });

  return printer.printList(ts.ListFormat.MultiLine, nodeArray, sourceFile);
};

const saveDefinitionToFileSystem = async (dir, file, content) => {
  const filepath = path.join(dir, file);

  await fse.writeFile(filepath, content);

  return filepath;
};

/**
 * Format the given definitions.
 * Uses the existing config if one is defined in the project.
 *
 * @param {string} content
 * @returns {string}
 */
const format = async content => {
  const configFile = await prettier.resolveConfigFile();
  const config = configFile
    ? await prettier.resolveConfig(configFile)
    : // Default config
      {
        singleQuote: true,
        useTabs: false,
        tabWidth: 2,
      };

  Object.assign(config, { parser: 'typescript' });

  return prettier.format(content, config);
};

const logDebugInformation = (definitions, options = {}) => {
  const { filepath } = options;

  const table = new CLITable({
    head: [
      chalk.bold(chalk.green('Model Type')),
      chalk.bold(chalk.blue('UID')),
      chalk.bold(chalk.blue('Type')),
      chalk.bold(chalk.gray('Attributes Count')),
    ],
    colAligns: ['center', 'left', 'left', 'center'],
  });

  const sortedDefinitions = definitions.map(def => ({
    ...def,
    attributesCount: getDefinitionAttributesCount(def.definition),
  }));

  for (const { schema, attributesCount } of sortedDefinitions) {
    const modelType = fp.upperFirst(getSchemaModelType(schema));
    const interfaceType = getSchemaInterfaceName(schema.uid);

    table.push([
      chalk.greenBright(modelType),
      chalk.blue(schema.uid),
      chalk.blue(interfaceType),
      chalk.grey(fp.isNil(attributesCount) ? 'N/A' : attributesCount),
    ]);
  }

  // Table
  console.log(table.toString());

  // Metrics
  console.log(
    chalk.greenBright(
      `Generated ${definitions.length} type definition for your Strapi application's schemas.`
    )
  );

  // Filepath
  const relativePath = path.relative(process.cwd(), filepath);

  console.log(
    chalk.grey(`The definitions file has been generated here: ${chalk.bold(relativePath)}`)
  );
};

module.exports = generateSchemasDefinitions;
