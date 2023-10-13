'use strict';

const { join } = require('path');
const { promisify } = require('util');
const execa = require('execa');
const fs = require('fs-extra');
const glob = promisify(require('glob').glob);

async function run() {
  const packageDirs = await glob('packages/**/*', { ignore: '**/node_modules/**' });

  console.log('Unlinking all packages');

 const pLimit = require('p-limit'); // Add p-limit library
const packages = packageDirs
  .filter((dir) => fs.pathExistsSync(join(dir, 'package.json')))
  .map((dir) => ({
    dir,
    pkgJSON: fs.readJSONSync(join(dir, 'package.json')),
  }));

async function unlinkPackages() {
  console.log('Unlinking packages...');

  try {
    const concurrencyLimit = 5; // Adjust as needed
    const unlinkPromises = packages.map(({ dir, pkgJSON }) =>
      execa('yarn', ['unlink'], { cwd: dir })
        .then(() => console.log(`Package ${pkgJSON.name} unlinked successfully.`))
        .catch((error) => console.error(`Error unlinking ${pkgJSON.name}: ${error}`))
    );

    const results = await pLimit(concurrencyLimit)(unlinkPromises);
    console.log('Unlinking complete.');

    const packageNames = packages.map((p) => p.pkgJSON.name);
    console.log(`Package names:\n${packageNames.join('\n')}\n`);
  } catch (error) {
    console.error('Error occurred while unlinking packages:', error);
  }
}

unlinkPackages();


run().catch((err) => console.error(err));
