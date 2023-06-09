'use strict';

const ts = require('typescript');
const prettier = require('prettier');
const fse = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const assert = require('assert');

const { factory } = ts;

/**
 * Aggregate the given TypeScript nodes into a single string
 *
 * @param {ts.Node[]} definitions
 * @return {string}
 */
const emitDefinitions = (definitions) => {
  const nodeArray = factory.createNodeArray(definitions);

  const sourceFile = ts.createSourceFile(
    'placeholder.ts',
    '',
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TS
  );

  const printer = ts.createPrinter({ omitTrailingSemicolon: true });

  return printer.printList(ts.ListFormat.MultiLine, nodeArray, sourceFile);
};

/**
 * Save the given string representation of TS nodes in a file
 * If the given directory doesn't exist, it'll be created automatically
 *
 * @param {string} dir
 * @param {string} file
 * @param {string} content
 *
 * @return {Promise<string>} The path of the created file
 */
const saveDefinitionToFileSystem = async (dir, file, content) => {
  const filepath = path.join(dir, file);

  fse.ensureDirSync(dir);
  await fse.writeFile(filepath, content);

  return filepath;
};

/**
 * Format the given definitions.
 * Uses the existing config if one is defined in the project.
 *
 * @param {string} content
 * @returns {Promise<string>}
 */
const format = async (content) => {
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

/**
 * Generate the extension block for a shared component from strapi/strapi
 *
 * @param {string} registry The registry to extend
 * @param {Array<{ uid: string; definition: ts.TypeNode }>} definitions
 * @returns {ts.ModuleDeclaration}
 */
const generateSharedExtensionDefinition = (registry, definitions) => {
  const properties = definitions.map(({ uid, definition }) =>
    factory.createPropertySignature(
      undefined,
      factory.createStringLiteral(uid, true),
      undefined,
      factory.createTypeReferenceNode(factory.createIdentifier(definition.name.escapedText))
    )
  );

  return factory.createModuleDeclaration(
    [factory.createModifier(ts.SyntaxKind.DeclareKeyword)],
    factory.createStringLiteral('@strapi/strapi', true),
    factory.createModuleBlock([
      factory.createModuleDeclaration(
        [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        factory.createIdentifier('Shared'),
        factory.createModuleBlock(
          properties.length > 0
            ? [
                factory.createInterfaceDeclaration(
                  [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
                  factory.createIdentifier(registry),
                  undefined,
                  undefined,
                  properties
                ),
              ]
            : []
        )
      ),
    ]),
    ts.NodeFlags.ExportContext
  );
};

const createLogger = (options = {}) => {
  const { silent = false, debug = false } = options;

  const state = { errors: 0, warning: 0 };

  return {
    get warnings() {
      return state.warning;
    },

    get errors() {
      return state.errors;
    },

    debug(...args) {
      if (silent || !debug) {
        return;
      }

      console.log(chalk.cyan(`[DEBUG]\t[${new Date().toISOString()}] (Typegen)`), ...args);
    },

    info(...args) {
      if (silent) {
        return;
      }

      console.info(chalk.blue(`[INFO]\t[${new Date().toISOString()}] (Typegen)`), ...args);
    },

    warn(...args) {
      state.warning += 1;

      if (silent) {
        return;
      }

      console.warn(chalk.yellow(`[WARN]\t[${new Date().toISOString()}] (Typegen)`), ...args);
    },

    error(...args) {
      state.errors += 1;

      if (silent) {
        return;
      }

      console.error(chalk.red(`[ERROR]\t[${new Date().toISOString()}] (Typegen)`), ...args);
    },
  };
};

const timer = () => {
  const state = {
    start: null,
    end: null,
  };

  return {
    start() {
      assert(state.start === null, 'The timer has already been started');
      assert(state.end === null, 'The timer has already been ended');

      state.start = Date.now();

      return this;
    },

    end() {
      assert(state.start !== null, 'The timer needs to be started before ending it');
      assert(state.end === null, 'The timer has already been ended');

      state.end = Date.now();

      return this;
    },

    get duration() {
      assert(state.start !== null, 'The timer has not been started');

      return ((state.end ?? Date.now) - state.start) / 1000;
    },
  };
};

module.exports = {
  emitDefinitions,
  saveDefinitionToFileSystem,
  format,
  generateSharedExtensionDefinition,
  createLogger,
  timer,
};
