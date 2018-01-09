const shell = require('shelljs');

// Store installation start date.
const installationStartDate = new Date();
const watcher = (label, cmd, withSuccess = true) => {
  if (label.length > 0) {
    shell.echo(`📦  ${label}`);
  }

  const data = shell.exec(cmd, {
    silent: false
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

shell.echo('');
shell.echo('🕓  The setup process can take few minutes.');
shell.echo('');

// Remove existing binary.
shell.rm('-f', '/usr/local/bin/strapi.js');

shell.cd('packages/strapi-utils');
watcher('Linking strapi-utils...', 'npm link');

shell.cd('../strapi-generate');
watcher('', 'npm install ../strapi-utils');
watcher('Linking strapi-generate...', 'npm link');

shell.cd('../strapi-generate-api');
watcher('Linking strapi-generate-api...', 'npm link');

shell.cd('../strapi-helper-plugin');
watcher('Linking strapi-helper-plugin...', 'npm link');

shell.cd('../strapi-admin');
watcher('', 'npm install ../strapi-helper-plugin');
watcher('', 'npm install ../strapi-utils');
shell.rm('-f', 'package-lock.json');
watcher('Linking strapi-admin...', 'npm install --no-optional', false);
watcher('', 'npm link', false);
watcher('Building...', 'npm run build');

shell.cd('../strapi-generate-admin');
watcher('', 'npm install ../strapi-admin');
watcher('Linking strapi-generate-admin...', 'npm link');

shell.cd('../strapi-generate-new');
watcher('', 'npm install ../strapi-utils');
watcher('Linking strapi-generate-new', 'npm link');

shell.cd('../strapi-mongoose');
watcher('', 'npm install ../strapi-utils');
watcher('Linking strapi-mongoose...', 'npm link');

shell.cd('../strapi');
watcher('', 'npm install ../strapi-generate ../strapi-generate-admin ../strapi-generate-api ../strapi-generate-new ../strapi-generate-plugin ../strapi-generate-policy ../strapi-generate-service ../strapi-utils');
watcher('Linking strapi...', 'npm link');

shell.cd('../strapi-plugin-email');
watcher('', 'npm install ../strapi-helper-plugin');
shell.rm('-f', 'package-lock.json');
watcher('Linking strapi-plugin-email...', 'npm link', false);
watcher('Building...', 'npm run build');

shell.cd('../strapi-plugin-users-permissions');
watcher('', 'npm install ../strapi-helper-plugin');
shell.rm('-f', 'package-lock.json');
watcher('Linking strapi-plugin-users-permissions...', 'npm link', false);
watcher('Building...', 'npm run build');

shell.cd('../strapi-plugin-content-manager');
watcher('', 'npm install ../strapi-helper-plugin');
shell.rm('-f', 'package-lock.json');
watcher('Linking strapi-plugin-content-manager...', 'npm link', false);
watcher('Building...', 'npm run build');

shell.cd('../strapi-plugin-settings-manager');
watcher('', 'npm install ../strapi-helper-plugin');
shell.rm('-f', 'package-lock.json');
watcher('Linking strapi-plugin-settings-manager...', 'npm link', false);
watcher('Building...', 'npm run build');

shell.cd('../strapi-plugin-content-type-builder');
watcher('', 'npm install ../strapi-helper-plugin');
watcher('', 'npm install ../strapi-generate');
watcher('', 'npm install ../strapi-generate-api');
shell.rm('-f', 'package-lock.json');
watcher('Linking strapi-plugin-content-type-builder...', 'npm link', false);
watcher('Building...', 'npm run build');

// Log installation duration.
const installationEndDate = new Date();
const duration = (installationEndDate.getTime() - installationStartDate.getTime()) / 1000;
shell.echo('Strapi has been succesfully installed.');
shell.echo(`Installation took ${Math.floor(duration / 60) > 0 ? `${Math.floor(duration / 60)} minutes and ` : ''}${Math.floor(duration % 60)} seconds.`);
