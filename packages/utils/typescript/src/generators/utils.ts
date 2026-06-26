import path from 'node:path';
import assert from 'node:assert';
import * as ts from 'typescript';
import fse from 'fs-extra';
import chalk from 'chalk';

const { factory } = ts;

const MODULE_DECLARATION = '@strapi/strapi';
const PUBLIC_NAMESPACE = 'Public';

/**
 * Aggregate the given TypeScript nodes into a single string
 */
export const emitDefinitions = (definitions: ts.Node[]): string => {
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
 * @return The path of the created file
 */
export const saveDefinitionToFileSystem = async (
  dir: string,
  file: string,
  content: string
): Promise<string> => {
  const filepath = path.join(dir, file);

  fse.ensureDirSync(dir);
  await fse.writeFile(filepath, content);

  return filepath;
};

/**
 * Format the given definitions.
 * Uses the existing config if one is defined in the project.
 */
export const format = async (content: string): Promise<string> => {
  // eslint-disable-next-line node/no-unsupported-features/es-syntax
  const prettier = await import('prettier'); // ESM-only

  const configFile = await prettier.resolveConfigFile();
  const config: any = configFile
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
 */
export const generateSharedExtensionDefinition = (
  registry: string,
  definitions: Array<{ uid: string; definition: ts.InterfaceDeclaration }>
): ts.ModuleDeclaration => {
  const properties = definitions.map(({ uid, definition }) =>
    factory.createPropertySignature(
      undefined,
      factory.createStringLiteral(uid, true),
      undefined,
      factory.createTypeReferenceNode(
        factory.createIdentifier(definition.name.escapedText as string)
      )
    )
  );

  return factory.createModuleDeclaration(
    [factory.createModifier(ts.SyntaxKind.DeclareKeyword)],
    factory.createStringLiteral(MODULE_DECLARATION, true),
    factory.createModuleBlock([
      factory.createModuleDeclaration(
        [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        factory.createIdentifier(PUBLIC_NAMESPACE),
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

interface CreateLoggerOptions {
  silent?: boolean;
  debug?: boolean;
}

export const createLogger = (options: CreateLoggerOptions = {}) => {
  const { silent = false, debug = false } = options;

  const state = { errors: 0, warning: 0 };

  return {
    get warnings() {
      return state.warning;
    },

    get errors() {
      return state.errors;
    },

    debug(...args: any[]) {
      if (silent || !debug) {
        return;
      }

      console.log(chalk.cyan(`[DEBUG]\t[${new Date().toISOString()}] (Typegen)`), ...args);
    },

    info(...args: any[]) {
      if (silent) {
        return;
      }

      console.info(chalk.blue(`[INFO]\t[${new Date().toISOString()}] (Typegen)`), ...args);
    },

    warn(...args: any[]) {
      state.warning += 1;

      if (silent) {
        return;
      }

      console.warn(chalk.yellow(`[WARN]\t[${new Date().toISOString()}] (Typegen)`), ...args);
    },

    error(...args: any[]) {
      state.errors += 1;

      if (silent) {
        return;
      }

      console.error(chalk.red(`[ERROR]\t[${new Date().toISOString()}] (Typegen)`), ...args);
    },
  };
};

export const timer = () => {
  const state: { start: number | null; end: number | null } = {
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

      return (((state.end ?? Date.now) as any) - (state.start as number)) / 1000;
    },
  };
};

export type Logger = ReturnType<typeof createLogger>;

/**
 * Options passed to each artifact generator (content-types, components).
 */
export interface GeneratorOptions {
  strapi: any;
  logger: Logger;
  pwd?: string;
}
