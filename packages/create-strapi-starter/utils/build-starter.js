'use strict';

const { resolve, join, basename } = require('path');
const os = require('os');
const fse = require('fs-extra');
const fetch = require('node-fetch');
const chalk = require('chalk');
const tar = require('tar');

const generateNewApp = require('strapi-generate-new');
const parseGitUrl = require('git-url-parse');
const ora = require('ora');
const ciEnv = require('ci-info');

const hasYarn = require('./has-yarn');

const { runInstall, runApp, initGit } = require('./child-process');

/**
 * @param  {} repo The path to repo
 */
async function getDefaultBranch(repo) {
  console.log(repo);
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}`);

    if (!response.ok) {
      throw Error(`Could not fetch the default branch`);
    }

    const { default_branch } = await response.json();

    return default_branch;
  } catch (err) {
    console.error(err);
  }
}

/**
 * @param  {string} starterUrl Github url to starter project
 */
async function getRepoInfo(starter) {
  try {
    const repoInfo = await parseGitUrl(starter);
    const { name, full_name, ref, protocols } = repoInfo;

    if (protocols.length === 0) {
      throw Error('Could not detect an acceptable URL');
    }

    return {
      name,
      full_name,
      ref,
    };
  } catch (err) {
    // If it's not a GitHub URL, then assume it's a shorthand for an official template
    return {
      full_name: `strapi/strapi-starter-${starter}`,
    };
  }
}

/**
 * @param  {string} starterUrl Github url for strapi starter
 * @param  {string} tmpDir Path to temporary directory
 */
async function downloadGithubRepo(starterUrl, tmpDir) {
  const { name, full_name, ref } = await getRepoInfo(starterUrl);
  const default_branch = await getDefaultBranch(full_name);

  const branch = ref ? ref : default_branch;

  // Download from GitHub
  const codeload = `https://codeload.github.com/${full_name}/tar.gz/${branch}`;
  const response = await fetch(codeload);
  if (!response.ok) {
    throw Error(`Could not download the ${chalk.green(`${name}`)} repository`);
  }

  await new Promise(resolve => {
    response.body.pipe(tar.extract({ strip: 1, cwd: tmpDir })).on('close', resolve);
  });
}

/**
 * @param  {string} filePath Path to starter.json file
 */
function readStarterJson(filePath) {
  const data = fse.readFileSync(filePath);
  return JSON.parse(data);
}

/**
 * @param  {string} rootPath Path to the project directory
 * @param  {string} projectName Name of the project
 */
function initPackageJson(rootPath, projectName) {
  const packageManager = hasYarn ? 'yarn' : 'npm run';

  fse.writeJson(
    join(rootPath, 'package.json'),
    {
      name: projectName,
      private: true,
      version: '0.0.0',
      scripts: {
        'dev:backend': `cd backend && ${packageManager} develop`,
        'dev:frontend': `wait-on http://localhost:1337/admin && cd frontend && ${packageManager} develop --open`,
        develop: `concurrently "${packageManager} dev:backend" "${packageManager} dev:frontend"`,
      },
      dependencies: {
        concurrently: '6.0.0',
        'wait-on': '5.2.1',
      },
    },
    {
      spaces: 2,
    }
  );
}

/**
 * @param  {string} path The directory path for install
 */
async function installWithLogs(path) {
  const installPrefix = chalk.yellow('Installing dependencies:');
  const loader = ora(installPrefix).start();
  const logInstall = (chunk = '') => {
    loader.text = `${installPrefix} ${chunk
      .toString()
      .split('\n')
      .join(' ')}`;
  };

  const runner = runInstall(path);
  runner.stdout.on('data', logInstall);
  runner.stderr.on('data', logInstall);

  await runner;

  loader.stop();
  console.log(`Dependencies installed ${chalk.green('successfully')}.`);
}

/**
 * @param  {object} projectArgs projectName and starterUrl for the project
 * @param  {object} program Commands for generating new application
 */
module.exports = async function buildStarter(projectArgs, program) {
  const { projectName, starterUrl } = projectArgs;

  // Create temporary directory for starter
  const tmpDir = await fse.mkdtemp(join(os.tmpdir(), 'strapi-'));

  // Fetch repo info
  const { full_name } = await getRepoInfo(starterUrl);
  // Download repo inside tmp dir
  try {
    await downloadGithubRepo(starterUrl, tmpDir);
  } catch (err) {
    throw Error(`Could not download ${chalk.yellow(`${full_name}`)} repository.`);
  }

  // Read starter package json for template url
  const starterJson = readStarterJson(join(tmpDir, 'starter.json'));

  // Project directory
  const rootPath = resolve(projectName);
  const projectBasename = basename(rootPath);

  // Copy the downloaded frontend folder to the project folder
  await fse.copy(join(tmpDir, 'frontend'), join(rootPath, 'frontend'), {
    overwrite: true,
    recursive: true,
  });

  // Delete temporary directory
  await fse.remove(tmpDir);

  console.log(`Creating Strapi starter frontend at ${chalk.green(`${rootPath}/frontend`)}.`);

  // Install frontend dependencies
  console.log(`Installing ${chalk.yellow(full_name)} starter`);

  await installWithLogs(join(rootPath, 'frontend'));

  // Set command options for Strapi app
  const generateStrapiAppOptions = {
    ...program,
    template: starterJson.template,
    run: false,
  };

  // Create strapi app using the template
  await generateNewApp(join(rootPath, 'backend'), generateStrapiAppOptions);

  // Setup monorepo
  initPackageJson(rootPath, projectBasename);

  // Add gitignore
  try {
    const gitignore = join(__dirname, '..', 'resources', 'gitignore');
    await fse.copy(gitignore, join(rootPath, '.gitignore'));
  } catch (err) {
    console.error(err);
  }

  await installWithLogs(rootPath);

  if (!ciEnv.isCI) {
    await initGit(rootPath);
  }

  console.log(chalk.green('Starting the app'));
  await runApp(rootPath);
};
