import os from 'node:os';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import outdent from 'outdent';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DefaultDocument } from '@strapi/admin/_internal';

import { getMonorepoAliases, getMonorepoEeAdminSource } from './core/aliases';
import { getHostAdminModules } from './core/host-admin-packages';
import { loadStrapiMonorepo } from './core/monorepo';

import type { BuildContext } from './create-build-context';

/**
 * Tailwind reads a missing directory as an empty one and exits 0, so a wrong root gives a page with
 * no styles and no error. This check names the missing directories instead
 */
const assertRootsExist = async (roots: string[]): Promise<void> => {
  const missing = (
    await Promise.all(
      roots.map(async (dir) => ((await fs.stat(dir).catch(() => null))?.isDirectory() ? null : dir))
    )
  ).filter((dir): dir is string => dir !== null);

  if (missing.length > 0) {
    throw new Error(
      [
        'Tailwind cannot scan these admin directories, because they do not exist:',
        ...missing.map((dir) => `    - ${dir}`),
        'Build the package that owns each one.',
      ].join(os.EOL)
    );
  }
};

type ScanContext = Pick<BuildContext, 'cwd' | 'runtimeDir' | 'plugins' | 'customisations'>;

/**
 * The directories Tailwind scans for class names. Tailwind never looks in `node_modules`, so the
 * stylesheet must name every directory that holds admin code. Four lists supply them: the
 * `@strapi/strapi` dependencies that export `./strapi-admin`, the enabled plugins, the Enterprise
 * sources of `@strapi/admin`, and the application's own `src/admin`.
 *
 * `dev` is the Vite development server, which serves `admin/src`. Tailwind must scan what Vite
 * serves. Every other case scans `dist`
 */
const getScanRoots = async (ctx: ScanContext, dev: boolean): Promise<string[]> => {
  const requireFromEntry = createRequire(path.join(ctx.runtimeDir, 'app.js'));
  const monorepo = dev ? await loadStrapiMonorepo(ctx.cwd) : undefined;
  const aliases = getMonorepoAliases({ monorepo });

  // The application never declares the host admin packages, so resolve them from `@strapi/strapi`.
  // Under strict pnpm they resolve from nowhere else
  const manifestPath = require.resolve('@strapi/strapi/package.json');
  const requireFromHost = createRequire(manifestPath);

  const hostRoots = getHostAdminModules(requireFromHost, manifestPath).map(
    ({ modulePath, dir }) => aliases[modulePath] ?? dir
  );

  // The monorepo alias wins over the admin entry, because it names the directory Vite serves
  const pluginRoots = ctx.plugins.map(
    (plugin) =>
      aliases[plugin.modulePath] ?? path.dirname(requireFromEntry.resolve(plugin.modulePath))
  );

  // The `@strapi/admin` alias names `admin/src` only, so the Enterprise sources are a second root
  // in development. Production compiles both trees into one `dist/admin`
  const eeAdminSource = getMonorepoEeAdminSource({ monorepo });
  const eeRoots = eeAdminSource ? [eeAdminSource] : [];

  // `customisations.path` is the `app.{js,ts,…}` file, so the root is its directory
  const appRoots = ctx.customisations ? [path.dirname(ctx.customisations.path)] : [];

  // A package can be both a host dependency and an enabled plugin
  const roots = [...new Set([...hostRoots, ...pluginRoots, ...eeRoots, ...appRoots])];

  await assertRootsExist(roots);

  return roots;
};

/**
 * Tailwind keeps an `@source` value as written and decodes no backslash escape. So quote the path
 * with a character it does not hold. A real path holds one quote character at most
 *
 * A glob metacharacter in the path needs no escape either, and must not get one. Probe, this
 * worktree: a root holding `(x86)` scans correctly as written, and the same root with `\(x86\)`
 * scans nothing. Both the oxide `Scanner` and the `@source` CSS layer agree
 */
const toCssString = (value: string): string => {
  if (!value.includes('"')) {
    return `"${value}"`;
  }

  if (!value.includes("'")) {
    return `'${value}'`;
  }

  throw new Error(
    `Strapi cannot write "${value}" into the admin stylesheet, because the path holds both quote characters. Move the directory.`
  );
};

/**
 * An `@source` value is a glob, and a glob separator is a forward slash on every platform. Split on
 * both separators, so the result does not depend on the platform that runs the build
 */
const toGlobPath = (value: string): string => value.split(/[\\/]/).join('/');

/** Files that hold class names but reach no page. They add candidates and bytes for nothing */
const EXCLUDED_SOURCES = [
  '**/__tests__/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/*.stories.*',
  '**/*.d.ts',
  '**/*.map',
];

const getSourceLines = (roots: string[]): string =>
  roots
    .map(toGlobPath)
    .flatMap((root) => [
      `@source ${toCssString(root)};`,
      ...EXCLUDED_SOURCES.map((pattern) => `@source not ${toCssString(`${root}/${pattern}`)};`),
    ])
    .join('\n');

const getStylesheet = (ctx: BuildContext): string => outdent`
      /**
       * This file was automatically generated by Strapi.
       * Any modifications made will be discarded.
       */
      @import '@strapi/strapi/admin/styles.css';

      ${getSourceLines(ctx.scanRoots)}
    `;

const getEntryModule = (ctx: BuildContext): string => {
  const pluginsObject = ctx.plugins
    .map(({ name, importName }) => `'${name}': ${importName}`)
    .join(',\n');

  const pluginsImport = ctx.plugins
    .map(({ importName, modulePath }) => `import ${importName} from '${modulePath}';`)
    .join('\n');

  return outdent`
        /**
         * This file was automatically generated by Strapi.
         * Any modifications made will be discarded.
         */
        import './styles.css';
        ${pluginsImport}
        import { renderAdmin } from "@strapi/strapi/admin"

        ${
          ctx.customisations?.modulePath
            ? `import customisations from '${ctx.customisations.modulePath}'`
            : ''
        }

        renderAdmin(
          document.getElementById("strapi"),
          {
            ${ctx.customisations?.modulePath ? 'customisations,' : ''}
            ${ctx.features ? `features: ${JSON.stringify(ctx.features)},` : ''}
            plugins: {
        ${pluginsObject}
            }
        })
      `;
};

interface GetDocumentHTMLArgs extends Pick<BuildContext, 'logger'> {
  props?: {
    entryPath?: string;
  };
}

/**
 * TODO: Here in the future we could add the ability
 * to load a user's Document component?
 */
const getDocumentHTML = ({ logger, props = {} }: GetDocumentHTMLArgs) => {
  const result = renderToStaticMarkup(createElement(DefaultDocument, props));
  logger.debug('Rendered the HTML');

  return outdent`<!DOCTYPE html>${result}`;
};

const AUTO_GENERATED_WARNING = `
This file was automatically generated by Strapi.
Any modifications made will be discarded.
`.trim();

/**
 * Because we now auto-generate the index.html file,
 * we should be clear that people _should not_ modify it.
 *
 * @internal
 */
const decorateHTMLWithAutoGeneratedWarning = (htmlTemplate: string): string =>
  htmlTemplate.replace(/<head/, `\n<!--\n${AUTO_GENERATED_WARNING}\n-->\n<head`);

const writeStaticClientFiles = async (ctx: BuildContext) => {
  const prettier = await import('prettier'); // ESM-only

  /**
   * For everything to work effectively we create a client folder in `.strapi` at the cwd level.
   * We then use the function we need to "createAdmin" as well as generate the Document index.html as well.
   *
   * All this links together an imaginary "src/index" that then allows vite to correctly build the admin panel.
   */

  await fs.mkdir(ctx.runtimeDir, { recursive: true });
  ctx.logger.debug('Created the runtime directory');

  const indexHtml = decorateHTMLWithAutoGeneratedWarning(
    await getDocumentHTML({
      logger: ctx.logger,
      props:
        ctx.bundler === 'vite'
          ? {
              entryPath: `/${ctx.entry}`,
            }
          : undefined,
    })
  );

  await fs.writeFile(
    path.join(ctx.runtimeDir, 'index.html'),
    await prettier.format(indexHtml, {
      parser: 'html',
    })
  );
  ctx.logger.debug('Wrote the index.html file');
  await fs.writeFile(
    path.join(ctx.runtimeDir, 'app.js'),
    await prettier.format(getEntryModule(ctx), {
      parser: 'babel',
    })
  );
  ctx.logger.debug('Wrote the app.js file');

  await fs.writeFile(path.join(ctx.runtimeDir, 'styles.css'), getStylesheet(ctx));
  ctx.logger.debug('Wrote the styles.css file');
};

export { writeStaticClientFiles, getDocumentHTML, getScanRoots, getStylesheet, toGlobPath };
