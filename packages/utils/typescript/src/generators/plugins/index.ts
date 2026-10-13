import path from 'node:path';
import * as ts from 'typescript';

import { emitDefinitions, format } from '../utils';
import type { GeneratorOptions } from '../utils';
import { compareCodeUnits } from '../common/compare';

type EnabledPlugin = {
  enabled: boolean;
  pathToPlugin?: string;
  packageInfo?: { name?: string };
  info?: { packageName?: string };
};

const declarationExtensions = new Set<string>([
  ts.Extension.Dts,
  ts.Extension.Dmts,
  ts.Extension.Dcts,
]);

const realpath = (filename: string) => ts.sys.realpath?.(filename) ?? path.resolve(filename);

const readCompilerOptions = (appDir: string): ts.CompilerOptions => {
  const configPath = path.join(appDir, 'tsconfig.json');
  if (ts.sys.fileExists(configPath) === false) {
    return { module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10 };
  }

  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error !== undefined) {
    throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  }

  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    appDir,
    undefined,
    configPath
  );
  // Generation may run before any input files exist. Invalid compiler options still matter.
  const errors = parsed.errors.filter((error) => error.code !== 18002 && error.code !== 18003);
  if (errors.length > 0) {
    throw new Error(
      errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('\n')
    );
  }

  return parsed.options;
};

const resolveDeclaration = (
  specifier: string,
  containingFile: string,
  compilerOptions: ts.CompilerOptions,
  pluginDirectory: string
): string | undefined => {
  const mode = ts.getImpliedNodeFormatForFile(containingFile, undefined, ts.sys, compilerOptions);
  const resolved = ts.resolveModuleName(
    specifier,
    containingFile,
    compilerOptions,
    ts.sys,
    undefined,
    undefined,
    mode
  ).resolvedModule;

  if (resolved === undefined || declarationExtensions.has(resolved.extension) === false) {
    return undefined;
  }

  const filename = path.resolve(resolved.resolvedFileName);
  const relative = path.relative(realpath(pluginDirectory), realpath(filename));
  // An alias or a same-named package elsewhere must not import another plugin's contract.
  if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return undefined;
  }

  return filename;
};

const packageNameOf = (specifier: string) => {
  const segments = specifier.split('/');
  return (specifier.startsWith('@') ? segments.slice(0, 2) : segments.slice(0, 1)).join('/');
};

/**
 * Names of the packages `@strapi/strapi/strict-types` already loads. Their store path under a
 * strict package manager layout is machine-local, so they must not be imported again.
 */
const readBundledPackages = (
  containingFile: string,
  compilerOptionsList: ts.CompilerOptions[]
): Set<string> => {
  for (const compilerOptions of compilerOptionsList) {
    const mode = ts.getImpliedNodeFormatForFile(containingFile, undefined, ts.sys, compilerOptions);
    const resolved = ts.resolveModuleName(
      '@strapi/strapi/strict-types',
      containingFile,
      compilerOptions,
      ts.sys,
      undefined,
      undefined,
      mode
    ).resolvedModule;
    if (resolved === undefined) {
      continue;
    }

    const contents = ts.sys.readFile(resolved.resolvedFileName);
    if (contents === undefined) {
      continue;
    }

    const { typeReferenceDirectives } = ts.preProcessFile(contents, false);
    return new Set(typeReferenceDirectives.map(({ fileName }) => packageNameOf(fileName)));
  }

  return new Set();
};

const relativeImport = (filename: string, containingFile: string) => {
  const relative = path.relative(path.dirname(containingFile), filename).split(path.sep).join('/');
  return relative.startsWith('../') ? relative : `./${relative}`;
};

/** Imports the server declarations of enabled, loaded plugins without enabling strict typing. */
export const generatePluginDefinitions = async (options: GeneratorOptions) => {
  const { strapi } = options;
  const appDir = options.appDir ?? process.cwd();
  const containingFile = path.join(options.pwd ?? appDir, 'plugins.d.ts');
  // Preserve the installed path in generated imports, including workspace and pnpm links.
  // Canonical paths are used only to identify the plugin and deduplicate declarations.
  const compilerOptions = { ...readCompilerOptions(appDir), preserveSymlinks: true };
  const modernOptions = {
    ...compilerOptions,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
  };
  const enabledPlugins: Record<string, EnabledPlugin> = strapi.config.get('enabledPlugins', {});
  const dependencies: Record<string, unknown> = strapi.config.get('info.dependencies', {});
  const importsByDeclaration = new Map<string, string>();
  const bundledPackages = readBundledPackages(containingFile, [compilerOptions, modernOptions]);

  for (const [name, plugin] of Object.entries(enabledPlugins).sort(([a], [b]) =>
    compareCodeUnits(a, b)
  )) {
    if (
      plugin.enabled !== true ||
      Object.hasOwn(strapi.plugins, name) === false ||
      plugin.pathToPlugin === undefined ||
      ts.sys.directoryExists(plugin.pathToPlugin) === false
    ) {
      continue;
    }

    const pluginPackageName = plugin.packageInfo?.name ?? plugin.info?.packageName;
    if (pluginPackageName !== undefined && bundledPackages.has(pluginPackageName) === true) {
      options.logger.debug(`Skipping ${name}: @strapi/strapi/strict-types loads its contracts.`);
      continue;
    }

    const pluginDirectory = path.resolve(plugin.pathToPlugin);
    const packageNames = new Set([
      plugin.packageInfo?.name,
      plugin.info?.packageName,
      ...Object.keys(dependencies),
    ]);
    const candidates = [...packageNames]
      .filter((packageName): packageName is string => typeof packageName === 'string')
      .sort(compareCodeUnits)
      .map((packageName) => `${packageName}/strapi-server`);

    let declaration: string | undefined;
    let specifier: string | undefined;
    for (const candidate of candidates) {
      declaration = resolveDeclaration(candidate, containingFile, compilerOptions, pluginDirectory);
      if (declaration !== undefined) {
        specifier = candidate;
        break;
      }
    }

    if (declaration === undefined) {
      // Legacy Node resolution ignores package exports. Resolve only the server export with
      // modern resolution, then reference its declaration directly using the app's resolver.
      for (const candidate of candidates) {
        declaration = resolveDeclaration(candidate, containingFile, modernOptions, pluginDirectory);
        if (declaration !== undefined) {
          break;
        }
      }

      // Configured local plugins may have no node_modules entry. Package self-references
      // still resolve their server exports from inside the plugin directory.
      if (declaration === undefined && plugin.packageInfo?.name !== undefined) {
        declaration = resolveDeclaration(
          `${plugin.packageInfo.name}/strapi-server`,
          path.join(pluginDirectory, 'package.json'),
          modernOptions,
          pluginDirectory
        );
      }

      declaration ??= resolveDeclaration(
        path.join(pluginDirectory, 'strapi-server'),
        containingFile,
        compilerOptions,
        pluginDirectory
      );

      if (declaration !== undefined) {
        const relative = relativeImport(declaration, containingFile);
        if (
          resolveDeclaration(relative, containingFile, compilerOptions, pluginDirectory) ===
          declaration
        ) {
          specifier = relative;
        }
      }
    }

    if (declaration !== undefined && specifier !== undefined) {
      const identity = realpath(declaration);
      const previous = importsByDeclaration.get(identity);
      if (previous === undefined || specifier < previous) {
        importsByDeclaration.set(identity, specifier);
      }
    }
  }

  const imports = [...importsByDeclaration.values()].sort(compareCodeUnits);
  options.logger.debug(`Found ${imports.length} plugin server declarations.`);

  const definitions = imports.map((specifier) =>
    ts.factory.createImportDeclaration(
      undefined,
      ts.factory.createImportClause(true, undefined, ts.factory.createNamedImports([])),
      ts.factory.createStringLiteral(specifier, true),
      undefined
    )
  );
  const output = imports.length === 0 ? 'export {};\n' : emitDefinitions(definitions);

  return { output: await format(output), stats: { plugins: imports.length } };
};
