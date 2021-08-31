'use strict';

const fetch = require('node-fetch');
const tar = require('tar');
const parseGitUrl = require('git-url-parse');
const chalk = require('chalk');

const stopProcess = require('./stop-process');

function parseShorthand(template) {
  // Determine if it is comes from another owner
  if (template.includes('/')) {
    const [owner, partialName] = template.split('/');
    const name = `strapi-template-${partialName}`;
    return {
      name,
      fullName: `${owner}/${name}`,
    };
  }

  const name = `strapi-template-${template}`;
  return {
    name,
    fullName: `strapi/${name}`,
  };
}

/**
 * @param {string} repo The full name of the repository.
 */
async function getDefaultBranch(repo) {
  const response = await fetch(`https://api.github.com/repos/${repo}`);
  if (!response.ok) {
    stopProcess(
      `Could not find the information for ${chalk.yellow(
        repo
      )}. Make sure it is publicly accessible on github.`
    );
  }

  const { default_branch } = await response.json();
  return default_branch;
}

/**
 * @param {string} template GitHub URL or shorthand to a template project.
 */
async function getRepoInfo(template) {
  const { name, full_name: fullName, ref, filepath, protocols, source } = parseGitUrl(template);

  if (protocols.length === 0) {
    const repoInfo = parseShorthand(template);
    return {
      ...repoInfo,
      branch: await getDefaultBranch(repoInfo.fullName),
      usedShorthand: true,
    };
  }

  if (source !== 'github.com') {
    stopProcess(`GitHub URL not found for: ${chalk.yellow(template)}.`);
  }

  let branch;
  if (ref) {
    // Append the filepath to the parsed ref since a branch name could contain '/'
    // If so, the rest of the branch name will be considered 'filepath' by 'parseGitUrl'
    branch = filepath ? `${ref}/${filepath}` : ref;
  } else {
    branch = await getDefaultBranch(fullName);
  }

  return { name, fullName, branch };
}

/**
 * @param {string} repoInfo GitHub repository information (full name, branch...).
 * @param {string} tmpDir Path to the destination temporary directory.
 */
async function downloadGitHubRepo(repoInfo, tmpDir) {
  // Download from GitHub
  const { fullName, branch } = repoInfo;
  const codeload = `https://codeload.github.com/${fullName}/tar.gz/${branch}`;
  const response = await fetch(codeload);
  if (!response.ok) {
    throw Error(`Could not download the ${chalk.yellow(fullName)} repository.`);
  }

  await new Promise(resolve => {
    response.body.pipe(tar.extract({ strip: 1, cwd: tmpDir })).on('close', resolve);
  });
}

module.exports = { getRepoInfo, downloadGitHubRepo };
