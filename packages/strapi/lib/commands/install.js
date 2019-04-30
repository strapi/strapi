const path = require('path');
const fs = require('fs');
const ora = require('ora');
const execa = require('execa');
const { cli } = require('strapi-utils');

module.exports = async plugins => {
  if (!cli.isStrapiApp()) {
    return console.log(
      `⛔️ ${cyan('strapi install')} can only be used inside a Strapi project.`
    );
  }

  const loader = ora();
  const dir = process.cwd();

  const pluginArgs = plugins.map(name => `strapi-plugin-${name}`);

  try {
    loader.start(`Installing dependencies`);

    const useYarn = fs.existsSync(path.join(dir, 'yarn.lock'));
    if (useYarn) {
      await execa('yarn', ['add', ...pluginArgs]);
    } else {
      await execa('npm', ['install', '--save', ...pluginArgs]);
    }

    loader.succeed();

    loader.start(`Rebuilding admin UI`);
    await execa('npm', ['run', 'build']);
    loader.succeed();
  } catch (err) {
    loader.clear();
    console.error(err.message);
    process.exit(1)
  }
};
