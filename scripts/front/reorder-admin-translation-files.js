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

  await Promise.all(
    translationFiles.map(async trad => {
      const cleanedFile = Object.keys(orderedData).reduce((acc, current) => {
        const currentTrad = fs.readJsonSync(trad);

        if (currentTrad[current]) {
          acc[current] = currentTrad[current];
        }

        return acc;
      }, {});

      try {
        await fs.writeJSON(trad, cleanedFile, { spaces: 2 });
      } catch (err) {
        console.log(err);
      }
    })
  );
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
