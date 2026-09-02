import path from 'node:path';

import type { Plugin } from 'vite';

import type { BuildContext } from '../create-build-context';

const buildFilesPlugin = (ctx: Pick<BuildContext, 'cwd' | 'runtimeDir'>): Plugin => {
  // Vite keys the html asset by its path from the root, so move it to the top level
  const htmlKey = path
    .relative(ctx.cwd, path.join(ctx.runtimeDir, 'index.html'))
    .split(path.sep)
    .join('/');

  return {
    name: 'strapi/server/build-files',
    apply: 'build',
    // Run after Vite's build:html plugin, which is what emits the html asset
    enforce: 'post',
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

export { buildFilesPlugin };
