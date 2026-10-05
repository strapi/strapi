import fs from 'node:fs';
import path from 'node:path';

import { defineConfig } from 'rollup';
import { baseConfig } from '../../../rollup.utils.mjs';

/**
 * The preview script (server/src/preview/controllers/previewScript.js) is a standalone
 * artifact injected into the user's site inside the preview iframe.
 *
 * It must NOT be bundled to avoid any wrapper code or hoisting. That's why we simply
 * copy it verbatim into the dist folder, and let a controller serve it as-is.
 */
const copyPreviewScript = () => ({
  name: 'copy-preview-script',
  writeBundle() {
    const src = path.resolve('server/src/preview/controllers/previewScript.js');
    const dest = path.resolve('dist/server/preview/controllers/previewScript.js');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  },
});

const serverConfig = baseConfig({
  input: {
    index: './server/src/index.ts',
  },
  rootDir: './server/src',
  outDir: './dist/server',
});
serverConfig.plugins = [...serverConfig.plugins, copyPreviewScript()];

export default defineConfig([
  serverConfig,
  baseConfig({
    input: {
      index: './admin/src/index.ts',
    },
    rootDir: './admin/src',
    outDir: './dist/admin',
  }),
  baseConfig({
    input: {
      index: './shared/index.ts',
    },
    outDir: './dist/shared',
  }),
]);
