import path from 'node:path';

import type { Plugin } from 'vite';

import { getDocumentHTML } from '../staticFiles';
import type { BuildContext } from '../create-build-context';

type BuildFilesContext = Pick<
  BuildContext,
  'cwd' | 'runtimeDir' | 'basePath' | 'logger' | 'nextDesignSystem'
>;

const htmlEntryPlugin = (ctx: BuildFilesContext): Plugin => {
  const htmlPath = path.join(ctx.runtimeDir, 'index.html');
  // Vite keys the html asset by its path from the root, so move it to the top level
  const htmlKey = path.relative(ctx.cwd, htmlPath).split(path.sep).join('/');

  return {
    name: 'strapi/server/build-files',
    apply: 'build',
    // Run after Vite's build:html plugin, which is what emits the html asset
    enforce: 'post',
    // A custom src/admin/vite.config can replace build.rollupOptions.input, so add the html back
    options(options) {
      const { input = {} } = options;

      if (typeof input === 'string' || Array.isArray(input)) {
        const entries = [input].flat();
        return entries.includes(htmlPath) ? null : { ...options, input: [...entries, htmlPath] };
      }

      return Object.values(input).includes(htmlPath)
        ? null
        : { ...options, input: { ...input, 'strapi-admin': htmlPath } };
    },
    async generateBundle(_options, outputBundle) {
      const asset = outputBundle[htmlKey];

      if (!asset) {
        throw new Error(
          `Failed to find the html asset in bundle (${htmlKey}). Vite must build that file; a custom src/admin/vite.config must not replace build.rollupOptions.input`
        );
      }

      asset.fileName = 'index.html';
      outputBundle['index.html'] = asset;
      delete outputBundle[htmlKey];
    },
  };
};

// Flag-off build, identical to the build before the flag. Delete it when the flag goes
const legacyBuildFilesPlugin = (ctx: BuildFilesContext): Plugin => {
  const CHUNK_ID = '.strapi/client/app.js';

  return {
    name: 'strapi/server/build-files',
    apply: 'build',
    buildStart() {
      this.emitFile({
        type: 'chunk',
        id: CHUNK_ID,
        name: 'strapi',
      });
    },
    async generateBundle(_options, outputBundle) {
      const bundle = outputBundle;
      const entryFile = Object.values(bundle).find(
        (file) =>
          file.type === 'chunk' && file.name === 'strapi' && file.facadeModuleId?.endsWith(CHUNK_ID)
      );

      if (!entryFile) {
        throw new Error(`Failed to find entry file in bundle (${CHUNK_ID})`);
      }

      if (entryFile.type !== 'chunk') {
        throw new Error('Entry file is not a chunk');
      }

      const entryFileName = entryFile.fileName;
      const entryPath = [ctx.basePath.replace(/\/+$/, ''), entryFileName].join('/');

      this.emitFile({
        type: 'asset',
        fileName: 'index.html',
        source: getDocumentHTML({
          logger: ctx.logger,
          props: {
            entryPath,
          },
        }),
      });
    },
  };
};

const buildFilesPlugin = (ctx: BuildFilesContext): Plugin =>
  ctx.nextDesignSystem ? htmlEntryPlugin(ctx) : legacyBuildFilesPlugin(ctx);

export { buildFilesPlugin };
