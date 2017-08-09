const shell = require('shelljs');

// Remove existing binary.
shell.rm('-f', '/usr/local/bin/strapi.js');

shell.echo('Linking Strapi CLI...');

shell.cd('packages/strapi-utils');
shell.exec('npm link');

shell.cd('../strapi-generate');
shell.exec('npm install ../strapi-utils');
shell.exec('npm link');

shell.cd('../strapi-admin');
shell.exec('npm install ../strapi-utils');
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
shell.exec('npm install ../strapi-generate ../strapi-generate-admin ../strapi-generate-api ../strapi-generate-new ../strapi-generate-policy ../strapi-generate-service ../strapi-mongoose ../strapi-utils');
shell.exec('npm link');

shell.cd('../strapi-helper-plugin');
shell.exec('npm install');

shell.cd('../strapi-plugin-content-manager');
shell.exec('npm install ../strapi-helper-plugin');
shell.rm('-f', 'package-lock.json');
shell.exec('npm link');

shell.cd('../strapi-plugin-settings-manager');
shell.exec('npm install ../strapi-helper-plugin');
shell.rm('-f', 'package-lock.json');
shell.exec('npm link');
