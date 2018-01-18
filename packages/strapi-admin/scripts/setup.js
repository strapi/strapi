const shell = require('shelljs');
const path = require('path');
const _ = require('lodash');

shell.echo('');
shell.echo('🕓  The setup process can take few minutes.');
shell.echo('');
shell.echo(`🔸  Administration Panel`);
shell.echo('📦  Installing packages...');

const pwd = shell.pwd();

const silent = process.env.npm_config_debug !== 'true';
const isDevelopmentMode = path.resolve(pwd.stdout).indexOf('strapi-admin') !== -1;
const appPath = isDevelopmentMode ? path.resolve(process.env.PWD, '..') : path.resolve(pwd.stdout, '..');

// Remove package-lock.json.
shell.rm('-rf', path.resolve(appPath, 'package-lock.json'));
shell.rm('-rf', path.resolve(appPath, 'admin', 'package-lock.json'));

// Install the project dependencies.
shell.exec(`cd ${appPath} && npm install --ignore-scripts`, {
  silent
});

// Install the administration dependencies.
shell.exec(`cd ${path.resolve(appPath, 'admin')} && npm install`, {
  silent
});

if (isDevelopmentMode) {
  shell.exec(`cd ${path.resolve(appPath, 'admin')} && npm link strapi-helper-plugin && npm link strapi-utils`, {
    silent
  });
} else {
  shell.exec(`cd ${path.resolve(appPath, 'admin', 'node_modules', 'strapi-helper-plugin')} && npm install`, {
    silent
  });
}

shell.echo('🏗  Building...');

const build = shell.exec(`cd ${path.resolve(appPath, 'admin')} && APP_PATH=${appPath} npm run build`, {
  silent
});

if (build.stderr && build.code !== 0) {
  console.error(build.stderr);
  process.exit(1);
}

shell.echo('✅  Success');
shell.echo('');

if (process.env.npm_config_plugins === 'true') {
  const plugins = path.resolve(appPath, 'plugins');

  shell.ls('* -d', plugins).forEach(function (plugin) {
    shell.echo(`🔸  Plugin - ${_.upperFirst(plugin)}`);
    shell.echo('📦  Installing packages...');
    shell.exec(`cd ${path.resolve(plugins, plugin)} && npm install`, {
      silent
    });

    if (isDevelopmentMode) {
      shell.exec(`cd ${path.resolve(plugins, plugin)} && npm link strapi-helper-plugin`, {
        silent
      });
    } else {
      shell.exec(`cd ${path.resolve(plugins, plugin, 'node_modules', 'strapi-helper-plugin')} && npm install`, {
        silent
      });
    }

    shell.echo('🏗  Building...');

    const build = shell.exec(`cd ${path.resolve(plugins, plugin)} && APP_PATH=${appPath} npm run build`, {
      silent
    });

    if (build.stderr && build.code !== 0) {
      console.error(build.stderr);
      process.exit(1);
    }

    shell.echo('✅  Success');
    shell.echo('');
  });
}
