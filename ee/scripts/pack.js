'use strict';

const { join } = require('path');
const execa = require('execa');
const fs = require('fs-extra');

async function run() {
  const pkg = process.argv[2];

  const pkgDir = join(__dirname, '../../packages', pkg);

  if (!fs.exists(pkgDir)) {
    throw new Error(`Package ${pkg} does not exist.`);
  }

  console.log(`Packing package ${pkg}.`);

  const pkgJSON = await fs.readJSON(join(pkgDir, 'package.json'));
  const npmIgnore = (await fs.readFile(join(pkgDir, '.npmignore'))).toString();

  try {
    await fs.writeJSON(join(pkgDir, 'package.json'), {
      ...pkgJSON,
      name: `${pkgJSON.name}-ee`,
    });

    await fs.writeFile(join(pkgDir, '.npmignore'), npmIgnore.replace(/^ee$/m, ''));

    const { stdout } = await execa('npm', ['pack'], { cwd: pkgDir });

    console.log(`Successfully packed ${pkg} at ${join(pkgDir, stdout)}`);
  } catch (err) {
    console.error(`Something went wrong while packing`, err);
  }

  await fs.writeJSON(join(pkgDir, 'package.json'), pkgJSON, { spaces: 2 });
  await fs.writeFile(join(pkgDir, '.npmignore'), npmIgnore);
}

run().catch(err => console.error(err));
