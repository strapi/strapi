'use strict';

const openURL = require('open');
const fetch = require('node-fetch');
const strapi = require('../index');

module.exports = async function ({ open, uuid, dependencies, verbose }) {
  if (verbose) {
    // eslint-disable-next-line no-param-reassign
    uuid = true;
    // eslint-disable-next-line no-param-reassign
    dependencies = true;
  }
  const appContext = await strapi.compile();
  const app = await strapi(appContext).register();

  let debugInfo = `
Launched In: ${Date.now() - app.config.launchedAt} ms
Environment: ${app.config.environment}
OS: ${process.platform}-${process.arch}
Strapi Version: ${app.config.info.strapi}
Node/Yarn Version: ${process.env.npm_config_user_agent}
Edition: ${app.EE ? 'Enterprise' : 'Community'}
Database: ${app.config.database.connection.client}`;
  if (uuid) {
    debugInfo += `\nUUID: ${app.config.uuid}`;
  }
  if (dependencies) {
    debugInfo += `\nDependencies: ${JSON.stringify(app.config.info.dependencies, null, 2)}`;
  }
  if (dependencies) {
    debugInfo += `\nDev Dependencies: ${JSON.stringify(app.config.info.devDependencies, null, 2)}`;
  }
  debugInfo += '\n';
  console.log(debugInfo);
  if (!open) return app.destroy();

  let githubIssueTemplate = await fetch(
    'https://raw.githubusercontent.com/strapi/strapi/main/.github/ISSUE_TEMPLATE/BUG_REPORT.md'
  ).then((res) => res.text());

  githubIssueTemplate = githubIssueTemplate.replace(/---[\s\S]*?---/, '');

  const template = githubIssueTemplate.replace(
    /### Required System information[\s\S]*?### Describe the bug/g,
    `### Required System information\n${debugInfo}\n### Describe the bug`
  );
  // url encode the template
  const encodedTemplate = encodeURIComponent(template);
  const url = `https://github.com/strapi/strapi/issues/new?assignees=&labels=&template=BUG_REPORT.md&body=${encodedTemplate}`;

  openURL(url);

  await app.destroy();
};
