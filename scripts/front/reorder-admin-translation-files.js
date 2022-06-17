'use strict';

const { join } = require('path');
const { promisify } = require('util');
const fs = require('fs-extra');
const glob = promisify(require('glob').glob);

const cleanFile = async filePath => {
  try {
    const mainTranslationFileArray = filePath.split('/');
    mainTranslationFileArray.splice(-1, 1);

    const mainTranslationFile = join(...mainTranslationFileArray, 'en.json');
    const mainTranslationFileJSON = await fs.readJSON(mainTranslationFile);
    const currentTranslationFileJSON = await fs.readJSON(filePath);

    const cleanedFile = Object.keys(mainTranslationFileJSON).reduce((acc, current) => {
      if (currentTranslationFileJSON[current]) {
        acc[current] = currentTranslationFileJSON[current];
      }

      return acc;
    }, {});

    await fs.writeJson(filePath, cleanedFile, { spaces: 2 });

    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
};

const reorderTrads = async filePath => {
  try {
    const data = await fs.readJSON(filePath);

    const orderedData = Object.keys(data)
      .sort()
      .reduce((acc, current) => {
        acc[current] = data[current];

        return acc;
      }, {});

    await fs.writeJSON(filePath, orderedData, { spaces: 2 });

    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
};

async function run() {
  const corePackageDirs = await glob('packages/core/*');
  const pluginsPackageDirs = await glob('packages/plugins/*');
  const packageDirs = [...corePackageDirs, ...pluginsPackageDirs];
  const pathToTranslationsFolder = ['admin', 'src', 'translations'];

  const translationFiles = packageDirs
    .filter(dir => {
      return fs.existsSync(join(dir, ...pathToTranslationsFolder, 'en.json'));
    })
    .reduce((acc, dir) => {
      const files = fs.readdirSync(join(dir, ...pathToTranslationsFolder));
      const filePaths = files
        .map(file => {
          return join(dir, ...pathToTranslationsFolder, file);
        })
        .filter(file => {
          return file.split('.')[1] !== 'js' && !fs.lstatSync(file).isDirectory();
        });

      return [...acc, ...filePaths];
    }, []);

  // Reorder
  await Promise.all(translationFiles.map(reorderTrads));

  // CleanFiles
  await Promise.all(translationFiles.map(cleanFile));
}

run().catch(err => console.error(err));
