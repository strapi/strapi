'use strict';

const openURL = require('open');
const fetch = require('node-fetch');
const { EOL } = require('os');
const strapi = require('../index');

module.exports = async ({ open, uuid, dependencies, verbose }) => {
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
    debugInfo += `${EOL}UUID: ${app.config.uuid}`;
  }

  if (dependencies) {
    debugInfo += `
Dependencies: ${JSON.stringify(app.config.info.dependencies, null, 2)}
Dev Dependencies: ${JSON.stringify(app.config.info.devDependencies, null, 2)}`;
  }

  debugInfo += EOL;
  console.log(debugInfo);

  if (!open) {
    return app.destroy();
  }

  let githubIssueTemplate = await fetch(
    'https://raw.githubusercontent.com/strapi/strapi/main/.github/ISSUE_TEMPLATE/BUG_REPORT.md'
  )
    .then((res) => res.text())
    .catch(async (e) => {
      console.error(e);
      await app.destroy();
      process.exit(1);
    });

  // removes the header from the template
  githubIssueTemplate = githubIssueTemplate.replace(/---[\s\S]*?---/, '');

  // replaces the debug info placeholder with the actual debug info
  const template = githubIssueTemplate.replace(
    /### Required System information[\s\S]*?### Describe the bug/g,
    `### Required System information${EOL}${debugInfo}${EOL}### Describe the bug`
  );

  // url encode the template
  const encodedTemplate = encodeURIComponent(template.trimStart());
  const url = `https://github.com/strapi/strapi/issues/new?assignees=&labels=&template=BUG_REPORT.md&body=${encodedTemplate}`;

  openURL(url);

  await app.destroy();
};

