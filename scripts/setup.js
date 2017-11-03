const shell = require('shelljs');

// Store installation start date.
const installationStartDate = new Date();

// Remove existing binary.
shell.rm('-f', '/usr/local/bin/strapi.js');

shell.echo('Linking Strapi CLI...');

shell.cd('packages/strapi-utils');
shell.exec('npm link');

shell.cd('../strapi-generate');
shell.exec('npm install ../strapi-utils');
shell.exec('npm link');

shell.cd('../strapi-generate-api');
shell.exec('npm link');

shell.cd('../strapi-helper-plugin');
shell.exec('npm link');

shell.cd('../strapi-admin');
shell.exec('npm install ../strapi-utils');
shell.exec('npm install ../strapi-helper-plugin');
shell.rm('-f', 'package-lock.json');
shell.exec('npm link');

shell.cd('../strapi-generate-admin');
shell.exec('npm install ../strapi-admin');
shell.exec('npm link');

shell.cd('../strapi-generate-new');
shell.exec('npm install ../strapi-utils');
shell.exec('npm link');

shell.cd('../strapi-mongoose');
shell.exec('npm install ../strapi-utils');
shell.exec('npm link');

shell.cd('../strapi');
shell.exec('npm install ../strapi-generate ../strapi-generate-admin ../strapi-generate-api ../strapi-generate-new ../strapi-generate-policy ../strapi-generate-service ../strapi-utils');
shell.exec('npm link');

shell.cd('../strapi-plugin-content-manager');
shell.exec('npm install ../strapi-helper-plugin');
shell.rm('-f', 'package-lock.json');
shell.exec('npm link');

shell.cd('../strapi-plugin-settings-manager');
shell.exec('npm install ../strapi-helper-plugin');
shell.rm('-f', 'package-lock.json');
shell.exec('npm link');

shell.cd('../strapi-plugin-content-type-builder');
shell.exec('npm install ../strapi-helper-plugin');
shell.exec('npm install ../strapi-generate');
shell.exec('npm install ../strapi-generate-api');
shell.rm('-f', 'package-lock.json');
shell.exec('npm link');

// Log installation duration.
const installationEndDate = new Date();
const duration = (installationEndDate.getTime() - installationStartDate.getTime()) / 1000;
shell.echo('Strapi has been succesfully installed.');
shell.echo(`Installation took ${Math.floor(duration / 60) > 0 ? `${Math.floor(duration / 60)} minutes and ` : ''}${Math.floor(duration % 60)} seconds.`);
