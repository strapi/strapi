const shell = require('shelljs');
const path = require('path');

shell.echo("It can takes few minutes...");

shell.exec('cd ./node_modules/strapi-helper-plugin');
shell.exec('npm install');

shell.exec('cd ../../');

const pwd = shell.pwd();
const plugins = path.resolve(pwd.stdout, '..', 'plugins');

shell.ls('* -d', plugins).forEach(function (plugin) {
  shell.exec(`cd ${path.resolve(plugins, plugin)} && npm install`);
  shell.exec(`cd ${path.resolve(plugins, plugin, 'node_modules', 'strapi-helper-plugin')} && npm install`);
  shell.exec(`cd ${path.resolve(plugins, plugin)} && npm run build`);
});
