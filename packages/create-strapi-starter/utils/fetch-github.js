'use strict';

const tar = require('tar');
const fetch = require('node-fetch');
const parseGitUrl = require('git-url-parse');
const chalk = require('chalk');

const stopProcess = require('./stop-process');

function parseShorthand(starter) {
  let owner = 'strapi';
  let name = `strapi-starter-${starter}`;

  // Determine if it is comes from another owner
  if (starter.includes('/')) {
    [owner, name] = starter.split('/');
    name = `strapi-starter-${name}`;
  }

  const full_name = `${owner}/${name}`;
  return {
    name,
    full_name,
  };
}

/**
 * @param {string} repo The full name of the repository.
 */
async function getDefaultBranch(repo) {
  const response = await fetch(`https://api.github.com/repos/${repo}`);
  if (!response.ok) {
    stopProcess(
      `Could not find the starter information for ${chalk.yellow(
        repo
      )}. Make sure it is publicly accessible on github.`
    );
  }

  const { default_branch } = await response.json();
  return default_branch;
}

/**
 * @param {string} starter GitHub url or shorthand to starter project.
 */
async function getRepoInfo(starter) {
  let usedShorthand = false;
  let { name, full_name, ref, filepath, protocols, source } = parseGitUrl(starter);

  if (protocols.length === 0) {
    usedShorthand = true;
    ({ name, full_name } = parseShorthand(starter));
  } else if (source !== 'github.com') {
    stopProcess(`GitHub URL not found for: ${chalk.yellow(starter)}.`);
  }

  let branch = await getDefaultBranch(full_name);
  if (ref) {
    // Append the filepath to the parsed ref since a branch name could contain '/'
    // If so, the rest of the branch name will be considered 'filepath' by 'parseGitUrl'
    branch = filepath ? `${ref}/${filepath}` : ref;
  }

  return { name, full_name, branch, usedShorthand };
}

/**
 * @param {string} starter GitHub url or shorthand to starter project.
 * @param {string} tmpDir Path to temporary directory.
 */
async function downloadGitHubRepo(repoInfo, tmpDir) {
  const { full_name, branch, usedShorthand } = repoInfo;

  // Download from GitHub
  const codeload = `https://codeload.github.com/${full_name}/tar.gz/${branch}`;
  const response = await fetch(codeload);
  if (!response.ok) {
    const message = usedShorthand ? `using the shortcut` : `using the url`;
    stopProcess(`Could not download the repository ${message}: ${chalk.yellow(`${full_name}`)}`);
  }

  await new Promise(resolve => {
    response.body.pipe(tar.extract({ strip: 1, cwd: tmpDir })).on('close', resolve);
  });
}

module.exports = { getRepoInfo, downloadGitHubRepo };
