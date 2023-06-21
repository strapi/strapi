'use strict';

const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

/**
 * A representation of a package.json file.
 * This could be inferred from yup/zod schema when we migrate to Typescript.
 *
 * @typedef PackageJSON
 * @property {string} name
 * @property {Record<string, string>} dependencies
 * @property {Record<string, string>} devDependencies
 * @property {Record<string, string>} peerDependencies
 * @property {string[]} browserslist
 */

/**
 * @typedef LoadPackageOptions
 * @property {string} cwd - The directory to start searching for a package.json file.
 */

/**
 * @internal
 *
 * @type {({cwd}: LoadPackageOptions) => Promise<PackageJSON>}
 *
 * Loads a package.json. It currently does not validate, this should be done later.
 */
const loadPkg = async ({ cwd }) => {
  const pkgPath = path.resolve(cwd, 'package.json');

  try {
    if (!pkgPath) {
      throw new Error();
    }

    const buffer = await fs.readFile(pkgPath);

    const rawJSON = JSON.parse(buffer.toString());

    return rawJSON;
  } catch (err) {
    console.error(`${chalk.red('no package.json found at path:')} ${chalk.bold(pkgPath)}`);

    process.exit(1);
  }
};

/**
 * @note
 * We could also:
 * - validate a package.json
 * - load a package.json with reporting errors whilst validating e.g. to track exports etc.
 */

module.exports = {
  loadPkg,
};
