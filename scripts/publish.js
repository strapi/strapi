const fs = require('fs');
const path = require('path');
const shell = require('shelljs');

try {
  const packages = fs.readdirSync(path.resolve(process.cwd(),'packages'), 'utf8');

  shell.cd('packages/strapi');

  packages.filter(pkg => pkg.indexOf('strapi') !== -1).forEach(pkg => {
    shell.cd('../' + pkg);
    shell.echo(pkg + ': npm publish --tag ' + process.argv[2]);
    shell.exec('npm publish --tag ' + process.argv[2]);
  });
} catch (error) {
  console.error(error);
}
