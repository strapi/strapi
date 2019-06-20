'use strict';

const { join } = require('path');
const fse = require('fs-extra');
const chalk = require('chalk');
const execa = require('execa');

const { trackUsage } = require('./utils/usage');
const packageJSON = require('./resources/json/package.json');
const databaseJSON = require('./resources/json/database.json.js');

module.exports = async function createProject(
  scope,
  { connection, dependencies }
) {
  console.log('Creating files');

  const { rootPath } = scope;
  const resources = join(__dirname, 'resources');

  try {
    // copy files
    await fse.copy(join(resources, 'files'), rootPath);

    // copy templates
    await fse.writeJSON(
      join(rootPath, 'package.json'),
      packageJSON({
        strapiDependencies: scope.strapiDependencies,
        additionalsDependencies: dependencies,
        strapiVersion: scope.strapiVersion,
        projectName: scope.name,
        uuid: scope.uuid,
      }),
      {
        spaces: 2,
      }
    );

    // ensure node_modules is created
    await fse.ensureDir(join(rootPath, 'node_modules'));

    await Promise.all(
      ['development', 'staging', 'production'].map(env => {
        return fse.writeJSON(
          join(rootPath, `config/environments/${env}/database.json`),
          databaseJSON({
            connection,
            env,
          }),
          { spaces: 2 }
        );
      })
    );
  } catch (err) {
    await fse.remove(scope.rootPath);
    throw err;
  }

  console.log('Installing packages. This might take a few minutes.');
  console.log();

  try {
    await runInstall(scope);
  } catch (error) {
    await trackUsage({
      event: 'didNotInstallProjectDependencies',
      scope,
      error,
    });
    throw error;
  }

  await trackUsage({ event: 'didCreateProject', scope });

  console.log(`Your application was created at ${chalk.green(rootPath)}.\n`);

  const cmd = chalk.cyan(scope.hasYarn ? 'yarn' : 'npm run');

  console.log('Available commands in your project:');
  console.log();
  console.log(`\t${cmd} develop`);
  console.log('\tStarts Strapi in watch mode');
  console.log();
  console.log(`\t${cmd} build`);
  console.log('Builds Strapi admin panel.');
  console.log();
  console.log(`\t${cmd} start`);
  console.log('Starts Strapi without watch mode.');
  console.log();
  console.log('You can start by doing:');
  console.log();
  console.log(`\t${cmd} ${rootPath}`);
  console.log(`\t${cmd} develop`);
};

const installArguments = ['install', '--production', '--no-optional'];
function runInstall({ rootPath, hasYarn }) {
  if (hasYarn) {
    return execa('yarnpkg', installArguments, {
      cwd: rootPath,
      stdio: 'inherit',
    });
  }
  return execa('npm', installArguments, { cwd: rootPath, stdio: 'inherit' });
}
