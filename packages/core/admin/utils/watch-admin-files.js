'use strict';

const path = require('path');
const fs = require('fs-extra');
const chokidar = require('chokidar');
const { isUsingTypeScript } = require('@strapi/typescript-utils');

/**
 * Listen to files change and copy the changed files in the .cache/admin folder
 * when using the dev mode
 * @param {string} dir
 */
async function watchAdminFiles(dir) {
  const useTypeScript = await isUsingTypeScript(path.join(dir, 'src', 'admin'), 'tsconfig.json');

  const cacheDir = path.join(dir, '.cache');
  const targetExtensionFile = useTypeScript ? 'app.tsx' : 'app.js';
  const appExtensionFile = path.join(dir, 'src', 'admin', targetExtensionFile);
  const extensionsPath = path.join(dir, 'src', 'admin', 'extensions');

  // Only watch the admin/app.js file and the files that are in the ./admin/extensions/folder
  const filesToWatch = [appExtensionFile, extensionsPath];

  const watcher = chokidar.watch(filesToWatch, {
    ignoreInitial: true,
    ignorePermissionErrors: true,
  });

  watcher.on('all', async (event, filePath) => {
    const isAppFile = filePath.includes(appExtensionFile);

    // The app.js file needs to be copied in the .cache/admin/src/app.js and the other ones needs to
    // be copied in the .cache/admin/src/extensions folder
    const targetPath = isAppFile
      ? path.join(path.normalize(filePath.split(appExtensionFile)[1]), targetExtensionFile)
      : path.join('extensions', path.normalize(filePath.split(extensionsPath)[1]));

    const destFolder = path.join(cacheDir, 'admin', 'src');

    if (event === 'unlink' || event === 'unlinkDir') {
      // Remove the file or folder
      // We need to copy the original files when deleting an override one
      try {
        fs.removeSync(path.join(destFolder, targetPath));
      } catch (err) {
        console.log('An error occurred while deleting the file', err);
      }
    } else {
      // In any other case just copy the file into the .cache/admin/src folder
      try {
        await fs.copy(filePath, path.join(destFolder, targetPath));
      } catch (err) {
        console.log(err);
      }
    }
  });
}

module.exports = watchAdminFiles;
