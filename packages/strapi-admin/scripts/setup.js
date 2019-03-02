const fs = require('fs');
const shell = require('shelljs');
const path = require('path');
const _ = require('lodash');

const pwd = shell.pwd();

const silent = process.env.npm_config_debug !== 'true';
const isDevelopmentMode = path.resolve(pwd.stdout).indexOf('strapi-admin') !== -1;
const appPath = isDevelopmentMode ? path.resolve(process.env.PWD, '..') : path.resolve(pwd.stdout, '..');

shell.echo('🏗  Building the admin...');

shell.cd(path.resolve(appPath, 'admin'));
const build = shell.exec(`cross-env APP_PATH="${appPath}" npm run build`, {silent});

if (build.stderr && build.code !== 0) {
  console.error(build.stderr);
  process.exit(1);
}

shell.echo('✅  Success');
shell.echo('');

if (process.env.npm_config_plugins === 'true') {
  const plugins = path.resolve(appPath, 'plugins');

  // TODO: build plugins in async
  shell.ls('* -d', plugins)
    .filter(x => {
      let hasAdminFolder;

      try {
        fs.accessSync(path.resolve(appPath, 'plugins', x, 'admin', 'src', 'containers', 'App'));
        hasAdminFolder = true;
      } catch(err) {
        hasAdminFolder = false;
      }

      return hasAdminFolder;
    })
    .forEach(function (plugin) {
      shell.echo(`🔸  Plugin - ${_.upperFirst(plugin)}`);
      shell.echo('📦  Installing packages...');
      shell.cd(path.resolve(plugins, plugin));
      shell.exec('npm install', {silent});

      if (isDevelopmentMode) {
        shell.cd(path.resolve(plugins, plugin));
        shell.exec('npm link strapi-helper-plugin', {silent});
      } else {
        shell.cd(path.resolve(plugins, plugin, 'node_modules', 'strapi-helper-plugin'));
        shell.exec('npm install', {silent});
      }

      shell.echo('🏗  Building...');
      shell.cd(path.resolve(plugins, plugin));
      const build = shell.exec(`cross-env APP_PATH="${appPath}" npm run build`, {silent});

      if (build.stderr && build.code !== 0) {
        console.error(build.stderr);
        process.exit(1);
      }

      shell.echo('✅  Success');
      shell.echo('');
    });
}
