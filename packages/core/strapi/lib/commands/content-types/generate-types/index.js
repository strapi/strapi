'use strict';

const path = require('path');

const CLITable = require('cli-table3');
const chalk = require('chalk');
const fp = require('lodash/fp');
const fse = require('fs-extra');

const tsUtils = require('@strapi/typescript-utils');

const createStrapiInstance = require('../../../index');

const { generateComponentDefinition } = require('./components');
const { generateContentTypeDefinition } = require('./content-types');
const { generateGlobalDefinition } = require('./global');
const { generateImports } = require('./imports');
const { logWarning, getSchemaTypeName } = require('./utils');

module.exports = async function({ outDir, file, silence }) {
  const [app, dirs] = await setup();

  const schemas = getAllStrapiSchemas(app);

  const table = createInfoTable();

  const definitions = generateTypesDefinitions(schemas);
  const globalDefinition = generateGlobalDefinition(definitions);
  const imports = generateImports();

  const fullDefinition = [
    imports,
    definitions.map(fp.get('definition')).join('\n'),
    globalDefinition,
  ].join('');

  await generateSchemaFile(outDir || dirs.app, fullDefinition, file);

  for (const definition of definitions) {
    const isValidDefinition = definition.definition !== null;
    const validateAndTransform = isValidDefinition ? fp.identity : chalk.redBright;

    table.push([
      validateAndTransform(definition.kind),
      validateAndTransform(definition.uid),
      validateAndTransform(definition.type),
      isValidDefinition ? chalk.greenBright('✓') : chalk.redBright('✗'),
    ]);
  }

  const successfullDefinition = fp.filter(d => !fp.isNil(d.definition), definitions);
  const skippedDefinition = fp.filter(d => fp.isNil(d.definition), definitions);

  if (!silence) {
    console.log(table.toString());
    console.log(
      chalk.greenBright(
        `Generated ${fp.size(
          successfullDefinition
        )} type definition for your Strapi application's schemas.`
      )
    );

    const skippedAmount = fp.size(skippedDefinition);

    if (skippedAmount > 0) {
      console.log(
        chalk.redBright(
          `Skipped ${skippedAmount} (${skippedDefinition.map(d => d.uid).join(', ')})`
        )
      );
    }
  }

  app.destroy();
};

/**
 * Setup a Strapi application based on the current process directory
 * @returns {Promise<[Strapi, { app: string, dist: string }]>}
 */
const setup = async () => {
  const dirs = { app: process.cwd(), dist: process.cwd() };

  const isTSProject = await tsUtils.isUsingTypeScript(dirs.app);

  if (isTSProject) {
    await tsUtils.compile(dirs.app, { configOptions: { options: { incremental: true } } });

    dirs.dist = await tsUtils.resolveOutDir(dirs.app);
  }

  const app = await createStrapiInstance({ appDir: dirs.app, distDir: dirs.dist }).register();

  return [app, dirs];
};

/**
 * Generate all the TypeScript definitions for the app schemas
 * @param {Object} schemas
 */
const generateTypesDefinitions = schemas => {
  const definitions = [];

  for (const [uid, schema] of Object.entries(schemas)) {
    const { modelType, kind } = schema;
    // Schema UID -> Interface Name
    const type = getSchemaTypeName(uid);

    let definition;

    // Components
    if (modelType === 'component') {
      definition = generateComponentDefinition(uid, schema, type);
    }

    // Content Types
    else if (modelType === 'contentType' && ['singleType', 'collectionType'].includes(kind)) {
      definition = generateContentTypeDefinition(uid, schema, type);
    }

    // Other
    else {
      logWarning(`"${uid}" has an invalid model definition. Skipping...`);
      definition = null;
    }

    // Add the generated definition to the list
    definitions.push({
      type,
      uid,
      schema,
      definition,
      kind: fp.upperFirst(modelType === 'component' ? 'component' : kind),
    });
  }

  return definitions;
};

/**
 * Generate the content-types definitions file based on the given arguments
 * @param {string} dir
 * @param {string} definition
 * @param {string} [file]
 */
const generateSchemaFile = async (dir, definition, file) => {
  const filePath = path.join(dir, file || 'schemas.d.ts');

  await fse.writeFile(filePath, definition);
};

/**
 * Get all content types and components loaded in the Strapi instance
 *
 * @param {Strapi} app
 * @returns {Object}
 */
const getAllStrapiSchemas = app => ({ ...app.contentTypes, ...app.components });

/**
 * Create a new info table for the content types definitions
 */
const createInfoTable = () => {
  return new CLITable({
    head: [chalk.green('Model Type'), chalk.blue('UID'), chalk.blue('Type'), chalk.gray('Status')],
    colAligns: ['center', 'left', 'left', 'center'],
  });
};
