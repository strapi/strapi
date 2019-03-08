const shell = require('shelljs');
const path = require('path');

shell.echo(`
🕓  The setup process can take few minutes.

🔸  Administration Panel
📦  Installing packages...
`);

const pwd = shell.pwd();

const silent = process.env.npm_config_debug !== 'true';
const isDevelopmentMode = path.resolve(pwd.stdout).indexOf('strapi-admin') !== -1;
const appPath = isDevelopmentMode ? path.resolve(process.env.PWD, '..') : path.resolve(pwd.stdout, '..');

// We just install the admin's dependencies here

// Remove package-lock.json.
shell.rm('-rf', path.resolve(appPath, 'package-lock.json'));
shell.rm('-rf', path.resolve(appPath, 'admin', 'package-lock.json'));

// Install the project dependencies.
shell.cd(appPath);
shell.exec('npm install --ignore-scripts', {silent});

// Install the administration dependencies.
shell.cd(path.resolve(appPath, 'admin'));
shell.exec('npm install', {silent});

if (isDevelopmentMode) {
  shell.cd(path.resolve(appPath, 'admin'));
  shell.exec('npm link strapi-helper-plugin && npm link strapi-utils', {silent});
} else {
  shell.cd(path.resolve(appPath, 'admin', 'node_modules', 'strapi-helper-plugin'));
  shell.exec('npm install', {silent});
}

shell.echo('Packages installed successfully');
