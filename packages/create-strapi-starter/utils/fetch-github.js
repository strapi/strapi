'use strict';

const tar = require('tar');
const fetch = require('node-fetch');
const parseGitUrl = require('git-url-parse');
const chalk = require('chalk');
const stopProcess = require('./stop-process');

function getShortcut(starter) {
  let full_name;
  // Determine if it is another organization
  if (starter.includes('/')) {
    const [org, project] = starter.split('/');
    full_name = `${org}/strapi-starter-${project}`;
  } else {
    full_name = `strapi/strapi-starter-${starter}`;
  }

  return {
    full_name,
    usedShortcut: true,
  };
}
/**
 * @param  {string} repo The path to repo
 */
async function getDefaultBranch(repo) {
  const response = await fetch(`https://api.github.com/repos/${repo}`);

  if (!response.ok) {
    console.log(
      `${chalk.red('error')} Could not fetch the default branch for: ${chalk.yellow(repo)}`
    );
  }

  const { default_branch } = await response.json();

  return default_branch;
}

/**
 * @param {string} starterUrl Github url to starter project
 */
async function getRepoInfo(starter) {
  try {
    const repoInfo = await parseGitUrl(starter);
    const { name, full_name, ref, protocols } = repoInfo;

    if (protocols.length === 0) {
      return getShortcut(starter);
    }

    return {
      name,
      full_name,
      ref,
    };
  } catch (err) {
    console.log(err);
  }
}

/**
 * @param  {string} starterUrl Github url for strapi starter
 * @param  {string} tmpDir Path to temporary directory
 */
async function downloadGithubRepo(starterUrl, tmpDir) {
  const { full_name, ref, usedShortcut } = await getRepoInfo(starterUrl);
  const default_branch = await getDefaultBranch(full_name);

  const branch = ref ? ref : default_branch;

  // Download from GitHub
  const codeload = `https://codeload.github.com/${full_name}/tar.gz/${branch}`;

  const response = await fetch(codeload);
  if (!response.ok) {
    const message = usedShortcut ? `using the shortcut` : `using the url`;
    stopProcess(
      `${chalk.red('error')} Could not download the repository ${message}: ${chalk.yellow(
        `${starterUrl}`
      )}`
    );
  }

  await new Promise(resolve => {
    response.body.pipe(tar.extract({ strip: 1, cwd: tmpDir })).on('close', resolve);
  });
}

module.exports = { getRepoInfo, downloadGithubRepo };
