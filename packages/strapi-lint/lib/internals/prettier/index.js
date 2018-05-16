/**
 *
 * Prettier config
 */

const glob = require('glob');
const prettier = require('prettier');
const fs = require('fs');
const listChangedFiles = require('../shared/listChangedFiles.js');
const changedFiles = listChangedFiles();

let didError = false;

const files = glob
  .sync('**/*.js', { ignore: '**/node_modules/**' })
  .filter(f => changedFiles.has(f))
  .filter(
    package =>
      !package.includes('README.md') &&
      !package.includes('strapi-middleware-views') &&
      !package.includes('strapi-lint') &&
      !package.includes('strapi-plugin-settings-manager'),
  );

const frontEndFiles = files
  .filter(f => f.includes('/admin/src') || f.includes('/src/components'));

const backendFiles = files
  .filter(f => !f.includes('/admin/src') && !f.includes('/src/components'));

if (!frontEndFiles.length) {
  return;
}

if (!backendFiles.length) {
  return;
}

const runPrettier = (files, isFront = true) => {
  const prettierConfigFolder = isFront ? 'front' : 'back';
  const prettierConfigPath = require.resolve(`./${prettierConfigFolder}/.prettierrc`);

  files.forEach(file => {
    const options = prettier.resolveConfig.sync(file, {
      config: prettierConfigPath
    });

    try {
      const input = fs.readFileSync(file, 'utf8');
      const output = prettier.format(input, options);

      if (output !== input) {
        fs.writeFileSync(file, output, 'utf8');
      }

    } catch(err) {
      didError = true;
      console.log('\n\n' + err.message);
      console.log(file);
    }
  });
}

runPrettier(frontEndFiles);
runPrettier(backendFiles);

if (didError) {
  process.exit(1);
}
