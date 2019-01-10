const shell = require('shelljs');
// Check npm version
const npm = shell.exec('npm -v').stdout;

if (parseFloat(npm) < 5) {
  throw new Error('[ERROR: Strapi] You need npm version @>=5');
}

const nodeVersion = shell.exec('node -v').stdout.replace('v', '');

if (parseFloat(nodeVersion) < 8.6) {
  throw new Error('[ERROR: Strapi] You need to use node version @>=9');
}

// Store installation start date.
const silent = process.env.npm_config_debug !== 'true';
const installationStartDate = new Date();

const watcher = (label, cmd, withSuccess = true) => {
  if (label.length > 0) {
    shell.echo(label);
  }

  const data = shell.exec(cmd, {
    silent,
  });

  if (data.stderr && data.code !== 0) {
    console.error(data.stderr);
    process.exit(1);
  }

  if (label.length > 0 && withSuccess) {
    shell.echo('✅  Success');
    shell.echo('');
  }
};

const asyncWatcher = (label, cmd, withSuccess = true, resolve) => {
  if (label.length > 0) {
    shell.echo(label);
  }

  return shell.exec(cmd, { silent, async: true }, (code, stdout, stderr) => {
    if (stderr && code !== 0) {
      console.error(stderr);
      process.exit(1);
    }

    return resolve();
  });
};

shell.echo('');
shell.echo('🕓  The setup process can take few minutes.');
shell.echo('');

// Remove existing binary.
shell.rm('-f', '/usr/local/bin/strapi.js');

shell.cd('packages/strapi-utils');
watcher('📦  Linking strapi-utils...', 'npm link');

shell.cd('../strapi-lint');
watcher('📦  Linking strapi-lint', 'npm link');

shell.cd('../strapi-generate');
watcher('', 'npm install ../strapi-utils');
watcher('📦  Linking strapi-generate...', 'npm link');

shell.cd('../strapi-generate-api');
watcher('📦  Linking strapi-generate-api...', 'npm link');

shell.cd('../strapi-helper-plugin');
watcher('📦  Linking strapi-helper-plugin...', 'npm link');

shell.cd('../strapi-admin');
watcher('', 'npm install ../strapi-helper-plugin --no-optional');
watcher('', 'npm install ../strapi-utils --no-optional');
shell.rm('-f', 'package-lock.json');

// Without these line Travis failed.
if (shell.test('-e', 'admin/src/config/plugins.json') === false) {
  shell.config.silent = silent;
  shell.cd('admin/src/config/');
  shell.ShellString('[]').to('plugins.json');
  shell.cd('../../../');
}

watcher('📦  Linking strapi-admin', 'npm link --no-optional', false);

shell.cd('../strapi-generate-admin');
watcher('', 'npm install ../strapi-admin');
watcher('📦  Linking strapi-generate-admin...', 'npm link');

shell.cd('../strapi-generate-new');
watcher('', 'npm install ../strapi-utils');
watcher('📦  Linking strapi-generate-new', 'npm link');

shell.cd('../strapi-hook-mongoose');
watcher('', 'npm install ../strapi-utils');
watcher('📦  Linking strapi-hook-mongoose...', 'npm link');

shell.cd('../strapi-hook-knex');
watcher('📦  Linking strapi-hook-knex...', 'npm link');

shell.cd('../strapi-hook-bookshelf');
watcher('', 'npm install ../strapi-utils');
watcher('', 'npm install ../strapi-hook-knex');
watcher('📦  Linking strapi-hook-bookshelf...', 'npm link');

shell.cd('../strapi');
watcher(
  '',
  'npm install ../strapi-generate ../strapi-generate-admin ../strapi-generate-api ../strapi-generate-new ../strapi-generate-plugin ../strapi-generate-policy ../strapi-generate-service ../strapi-utils',
);
watcher('📦  Linking strapi...', 'npm link');

shell.cd('../strapi-plugin-graphql');
watcher('📦  Linking strapi-plugin-graphql...', 'npm link --no-optional', false);

// Plugin services
shell.cd('../strapi-provider-upload-local');
watcher('📦  Linking strapi-provider-upload-local...', 'npm link --no-optional', false);

shell.cd('../strapi-provider-email-sendmail');
watcher('📦  Linking strapi-provider-email-sendmail...', 'npm link --no-optional', false);

// Plugins with admin
shell.cd('../strapi-plugin-documentation');
shell.rm('-f', 'package-lock.json');
watcher('', 'npm install ../strapi-helper-plugin --no-optional');
watcher('📦  Linking strapi-plugin-documentation...', 'npm link --no-optional', false);

shell.cd('../strapi-plugin-email');
shell.rm('-f', 'package-lock.json');
watcher('', 'npm install ../strapi-helper-plugin --no-optional');
watcher('', 'npm install ../strapi-provider-email-sendmail --no-optional');
watcher('📦  Linking strapi-plugin-email...', 'npm link --no-optional', false);

shell.cd('../strapi-plugin-users-permissions');
watcher('', 'npm install ../strapi-helper-plugin --no-optional');
watcher('', 'npm install ../strapi-utils --no-optional');
shell.rm('-f', 'package-lock.json');
watcher('📦  Linking strapi-plugin-users-permissions...', 'npm link --no-optional', false);

shell.cd('../strapi-plugin-content-manager');
watcher('', 'npm install ../strapi-helper-plugin --no-optional');
shell.rm('-f', 'package-lock.json');
watcher('📦  Linking strapi-plugin-content-manager...', 'npm link --no-optional', false);

shell.cd('../strapi-plugin-settings-manager');
watcher('', 'npm install ../strapi-helper-plugin --no-optional');
shell.rm('-f', 'package-lock.json');
watcher('📦  Linking strapi-plugin-settings-manager...', 'npm link --no-optional', false);

// Plugins with admin and other plugin's dependencies
shell.cd('../strapi-plugin-upload');
watcher('', 'npm install ../strapi-helper-plugin --no-optional');
watcher('', 'npm install ../strapi-provider-upload-local --no-optional');
shell.rm('-f', 'package-lock.json');
watcher('📦  Linking strapi-plugin-upload...', 'npm link --no-optional', false);

shell.cd('../strapi-plugin-content-type-builder');
watcher('', 'npm install ../strapi-helper-plugin --no-optional');
watcher('', 'npm install ../strapi-generate --no-optional');
watcher('', 'npm install ../strapi-generate-api --no-optional');
shell.rm('-f', 'package-lock.json');
watcher('📦  Linking strapi-plugin-content-type-builder...', 'npm link --no-optional', false);

const pluginsToBuild = [
  'admin',
  'content-manager',
  'content-type-builder',
  'documentation',
  'upload',
  'email',
  'users-permissions',
  'settings-manager',
];

const buildPlugins = async () => {
  const build = pckgName => {
    return new Promise(resolve => {
      const name = pckgName === 'admin' ? pckgName : `plugin-${pckgName}`;
      asyncWatcher(
        `🏗  Building ${name}...`,
        `cd ../strapi-${name} && IS_MONOREPO=true npm run build`,
        false,
        resolve,
      );
    });
  };

  return Promise.all(pluginsToBuild.map(plugin => build(plugin)));
};

const setup = async () => {
  if (process.env.npm_config_build) {
    if (process.platform === 'darwin') {
      // Allow async build for darwin platform
      await buildPlugins();
    } else {
      pluginsToBuild.map(name => {
        const pluginName = name === 'admin' ? name : `plugin-${name}`;
        shell.cd(`../strapi-${pluginName}`);

        return watcher(`🏗  Building ${pluginName}...`, 'IS_MONOREPO=true npm run build');
      });
    }
  }

  // Log installation duration.
  const installationEndDate = new Date();
  const duration = (installationEndDate.getTime() - installationStartDate.getTime()) / 1000;
  shell.echo('✅  Strapi has been succesfully installed.');
  shell.echo(
    `⏳  The installation took ${
      Math.floor(duration / 60) > 0 ? `${Math.floor(duration / 60)} minutes and ` : ''
    }${Math.floor(duration % 60)} seconds.`,
  );
};

setup();
