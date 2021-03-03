'use strict';

const tar = require('tar');
const fetch = require('node-fetch');
const parseGitUrl = require('git-url-parse');
const chalk = require('chalk');

/**
 * @param  {string} repo The path to repo
 */
async function getDefaultBranch(repo) {
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
 * @param {string} starterUrl Github url to starter project
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
    // If it's not a GitHub URL, then assume it's a shorthand
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

module.exports = { getRepoInfo, downloadGithubRepo };
