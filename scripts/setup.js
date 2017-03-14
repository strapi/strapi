const shell = require('shelljs');

// Remove existing binary.
shell.rm('-f', '/usr/local/bin/strapi.js');

shell.echo('Bootstraping packages and building dashboard...');
shell.echo('This can take few minutes (2-3)');
shell.exec('node node_modules/lerna/bin/lerna bootstrap --nohoist --stream');
shell.echo('Linking Strapi CLI...');
shell.cd('packages/strapi');
shell.exec('npm link');
