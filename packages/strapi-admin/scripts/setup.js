const shell = require('shelljs');
const path = require('path');
const _ = require('lodash');

shell.echo('');
shell.echo('🕓  The setup process can take few minutes.');
shell.echo('📦  Installing admin packages...');
shell.echo('');

const pwd = shell.pwd();

shell.exec(`cd ${path.resolve(pwd.stdout, 'node_modules', 'strapi-helper-plugin')} && npm install`, {
  silent: true
});

shell.echo('🏗  Building...');

const build = shell.exec(`cd ${path.resolve(pwd.stdout)} && npm run build`, {
  silent: true
});

if (build.stderr) {
  console.error(build.stderr);
}

const plugins = path.resolve(pwd.stdout, '..', 'plugins');

shell.ls('* -d', plugins).forEach(function (plugin) {
  shell.echo(`🔸  ${_.upperFirst(plugin)} (plugin)`);
  shell.echo('📦  Installing packages...');
  shell.exec(`cd ${path.resolve(plugins, plugin)} && npm install`, {
    silent: true
  });
  shell.exec(`cd ${path.resolve(plugins, plugin, 'node_modules', 'strapi-helper-plugin')} && npm install`, {
    silent: true
  });
  shell.echo('🏗  Building...');

  const build = shell.exec(`cd ${path.resolve(plugins, plugin)} && npm run build`, {
    silent: true
  });

  if (build.stderr) {
    console.error(build.stderr);
  }

  shell.echo('');
});
