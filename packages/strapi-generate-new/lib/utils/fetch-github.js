'use strict';

const fetch = require('node-fetch');
const tar = require('tar');
const parseGitUrl = require('git-url-parse');
const chalk = require('chalk');

const stopProcess = require('./stop-process');

function parseShorthand(template) {
  let owner = 'strapi';
  let name = `strapi-template-${template}`;

  // Determine if it is comes from another owner
  if (template.includes('/')) {
    [owner, name] = template.split('/');
    name = `strapi-template-${name}`;
  }

  const full_name = `${owner}/${name}`;
  return {
    name,
    full_name,
  };
}

async function getRepoInfo(template) {
  let { name, full_name, ref, filepath, protocols, source } = parseGitUrl(template);

  if (protocols.length === 0) {
    ({ name, full_name } = parseShorthand(template));
  } else if (source !== 'github.com') {
    stopProcess(`GitHub URL not found for: ${chalk.yellow(template)}.`);
  }

  let branch = await getDefaultBranch(full_name);
  if (ref) {
    // Append the filepath to the parsed ref since a branch name could contain '/'
    // If so, the rest of the branch name will be considered 'filepath' by 'parseGitUrl'
    branch = filepath ? `${ref}/${filepath}` : ref;
  }

  return { name, full_name, branch };
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

async function downloadGitHubRepo(repoInfo, templatePath) {
  // Download from GitHub
  const { full_name, branch } = repoInfo;
  const codeload = `https://codeload.github.com/${full_name}/tar.gz/${branch}`;
  const response = await fetch(codeload);
  if (!response.ok) {
    throw Error(`Could not download the ${chalk.yellow(full_name)} repository`);
  }

  await new Promise(resolve => {
    response.body.pipe(tar.extract({ strip: 1, cwd: templatePath })).on('close', resolve);
  });
}

module.exports = { getRepoInfo, downloadGitHubRepo };
