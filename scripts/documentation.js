const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const shell = require('shelljs');

try {
  const versions = fs.readdirSync(path.resolve(process.cwd(), 'docs'), 'utf8').filter(x => x[0] !== '.');

  _.forEach(versions, (version) => {
    console.log(`Strapi install plugins version ${version}`);
    shell.exec(`${path.join(process.cwd(), 'node_modules', '.bin', 'gitbook')} install ${path.join(process.cwd(), 'docs', version)}`);
    console.log(`Strapi build version ${version}`);
    shell.exec(`${path.join(process.cwd(), 'node_modules', '.bin', 'gitbook')} build ${path.join(process.cwd(), 'docs', version)}`);
  });

  console.log('Documentation has been built with success');
} catch (err) {
  if (err.stdout) {
    return console.log(err.stdout.toString('utf8'));
  }

  console.log(err);
}
