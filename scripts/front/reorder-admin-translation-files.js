const { join } = require('path');
const fs = require('fs-extra');
const { promisify } = require('util');
const glob = promisify(require('glob').glob);

async function orderTrads({ mainTranslationFile, translationFiles }) {
  const data = await fs.readJSON(mainTranslationFile);

  const orderedData = Object.keys(data)
    .sort()
    .reduce((acc, current) => {
      acc[current] = data[current];

      return acc;
    }, {});

  await fs.writeJSON(mainTranslationFile, orderedData, { spaces: 2 });

  const cleanFile = async trad => {
    const cleanedFile = {};
    const orderedDataKeys = Object.keys(orderedData);

    for (let i in orderedDataKeys) {
      try {
        const currentTrad = await fs.readJson(trad);
        const currentKey = orderedDataKeys[i];

        if (currentTrad[currentKey]) {
          cleanedFile[currentKey] = currentTrad[currentKey];
        }
      } catch (err) {
        console.error(err);
      }
    }

    try {
      await fs.writeJSON(trad, cleanedFile, { spaces: 2 });
    } catch (err) {
      console.error(err);
    }
  };

  await Promise.all(translationFiles.map(trad => cleanFile(trad)));
}

async function run() {
  const packageDirs = await glob('packages/*');
  const pathToTranslationsFolder = ['admin', 'src', 'translations'];

  const pluginsWithTranslationFiles = packageDirs
    .filter(
      dir =>
        (dir.startsWith('packages/strapi-plugin') || dir.startsWith('packages/strapi-admin')) &&
        fs.existsSync(join(dir, ...pathToTranslationsFolder, 'index.js'))
    )
    .map(dir => {
      const translationFiles = fs
        .readdirSync(join(dir, ...pathToTranslationsFolder))
        .filter(file => !file.includes('index.js') && !file.includes('en.json'))
        .map(file => join(dir, ...pathToTranslationsFolder, file));

      return {
        translationFiles,
        mainTranslationFile: join(dir, 'admin', 'src', 'translations', 'en.json'),
      };
    });

  await Promise.all(pluginsWithTranslationFiles.map(t => orderTrads(t)));
}

run().catch(err => console.error(err));
