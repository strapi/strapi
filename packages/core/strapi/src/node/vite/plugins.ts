import type { Plugin } from 'vite';

import { getDocumentHTML } from '../staticFiles';
import type { BuildContext } from '../create-build-context';

const buildFilesPlugin = (ctx: BuildContext): Plugin => {
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

export { buildFilesPlugin };
