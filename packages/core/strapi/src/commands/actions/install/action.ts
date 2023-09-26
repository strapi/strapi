/* eslint-disable @typescript-eslint/no-var-requires */
import { join } from 'path';
import { existsSync } from 'fs-extra';
import ora from 'ora';
import execa from 'execa';
import findPackagePath from '../../../load/package-path';

export default async (plugins: string[]) => {
  const loader = ora();
  const dir = process.cwd();

  const version = require(join(dir, 'package.json')).dependencies['@strapi/strapi'];

  const pluginArgs = plugins.map((name: string) => `@strapi/plugin-${name}@${version}`);

  try {
    loader.start(`Installing dependencies`);

    const useYarn = existsSync(join(dir, 'yarn.lock'));
    if (useYarn) {
      await execa('yarn', ['add', ...pluginArgs]);
    } else {
      await execa('npm', ['install', '--save', ...pluginArgs]);
    }

    loader.succeed();

    // check if rebuild is necessary
    let shouldRebuild = false;
    for (const name of plugins) {
      const pkgPath = findPackagePath(`@strapi/plugin-${name}`);
      if (existsSync(join(pkgPath, 'admin', 'src', 'index.js'))) {
        shouldRebuild = true;
      }
    }

    if (shouldRebuild) {
      loader.start(`Rebuilding admin UI`);
      await execa('npm', ['run', 'build']);
      loader.succeed();
    }
  } catch (err) {
    loader.clear();

    if (err instanceof Error) {
      console.error(err.message);
    }

    process.exit(1);
  }
};
