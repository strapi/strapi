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
shell.exec(`cd "${appPath}" && npm install --ignore-scripts`, {
  silent
});

// Install the administration dependencies.
shell.exec(`cd "${path.resolve(appPath, 'admin')}" && npm install`, {
  silent
});

if (isDevelopmentMode) {
  shell.exec(`cd "${path.resolve(appPath, 'admin')}" && npm link strapi-helper-plugin && npm link strapi-utils`, {
    silent
  });
} else {
  shell.exec(`cd "${path.resolve(appPath, 'admin', 'node_modules', 'strapi-helper-plugin')}" && npm install`, {
    silent
  });
}

shell.echo('Packaged installed successfully');
