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

module.exports = async function({ outDir, file }) {
  const [app, dirs] = await setup();

  const schemas = getAllStrapiSchemas(app);

  const table = createInfoTable();

  const definitions = generateTypesDefinitions(schemas);
  const globalDefinition = generateGlobalDefinition(definitions);
  const imports = generateImports();

  const fullDefinition = [
    imports,
    definitions.map(fp.get('definition')).join(''),
    globalDefinition,
  ].join('');

  await generateSchemaFile(outDir || dirs.app, fullDefinition, file);

  for (const defintion of definitions) {
    table.push([defintion.kind, defintion.uid, defintion.type, chalk.greenBright('✓')]);
  }

  console.log(table.toString());
  console.log(
    chalk.greenBright(
      `Generated ${fp.size(definitions)} type definition for your Strapi application's schemas.`
    )
  );

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
    else if (modelType === 'contentType') {
      definition = generateContentTypeDefinition(uid, schema, type);
    }

    // Other
    else {
      logWarning(
        `${uid} has an invalid model type: "${modelType}". Allowed model types are "component" and "contentType"`
      );
      continue;
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
