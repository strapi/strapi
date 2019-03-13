const fs = require('fs');
const path = require('path');
const shell = require('shelljs');

try {
  const packages = fs.readdirSync(path.resolve(process.cwd(), 'packages'), 'utf8');
  shell.cd('packages/strapi');

  packages
    .filter(pkg => pkg.includes('strapi'))
    .forEach(pkg => {
      shell.cd('../' + pkg);
      shell.echo(`Testing ${pkg} dependencies`);

      const data = shell.exec('snyk test --severity-threshold=high', { silent: true });

      if (data.code !== 0 && !data.stdout.includes('Missing node_modules folder')) {
        shell.echo(data.stdout);

        process.exit(1);
      }
    });
} catch (error) {
  console.error(error);
}
