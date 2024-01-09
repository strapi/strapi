import { join } from 'path';
import { existsSync, removeSync } from 'fs-extra';
import ora from 'ora';
import execa from 'execa';
import inquirer from 'inquirer';
import findPackagePath from '../../../load/package-path';

interface CmdOptions {
  deleteFiles?: boolean;
}

export default async (plugins: string[], { deleteFiles }: CmdOptions) => {
  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'deleteFiles',
      message: `Do you want to delete the plugin generated files in the extensions folder ?`,
      default: true,
      when: !deleteFiles,
    },
  ]);

  const loader = ora();
  const dir = process.cwd();

  const pluginArgs = plugins.map((name) => `@strapi/plugin-${name}`);

  try {
    // verify should rebuild before removing the pacakge
    let shouldRebuild = false;
    for (const name of plugins) {
      const pkgPath = findPackagePath(`@strapi/plugin-${name}`);
      if (existsSync(join(pkgPath, 'admin', 'src', 'index.js'))) {
        shouldRebuild = true;
      }
    }

    loader.start(`Uninstalling dependencies`);

    const useYarn = existsSync(join(dir, 'yarn.lock'));
    if (useYarn) {
      await execa('yarn', ['remove', ...pluginArgs]);
    } else {
      await execa('npm', ['remove', ...pluginArgs]);
    }

    loader.succeed();

    if (deleteFiles === true || answers.deleteFiles === true) {
      loader.start('Deleting old files');
      for (const name of plugins) {
        const pluginDir = join(dir, 'extensions', name);
        if (existsSync(pluginDir)) {
          removeSync(pluginDir);
        }
      }
      loader.succeed();
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
