import path from 'node:path';
import { createCommand } from 'commander';
import chalk from 'chalk';
import fse from 'fs-extra';

import { createStrapi, compileStrapi } from '@strapi/core';

import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';

const listMigrationFiles = async (dir: string): Promise<Set<string>> => {
  try {
    return new Set(await fse.readdir(dir));
  } catch {
    // The directory may not exist yet (no migrations generated before).
    return new Set();
  }
};

interface RenameComponentCLIOptions {
  displayName?: string;
}

/**
 * Moves a component to a new category and/or display name (either changes its
 * uid) and generates the data-preserving migration in a single step, reusing
 * the same rename resolver the Content-Type Builder admin uses.
 */
const action = async (
  uid: string,
  newCategory: string | undefined,
  { displayName }: RenameComponentCLIOptions = {}
) => {
  if (!newCategory && !displayName) {
    console.error(chalk.red('Provide a new category, a --display-name, or both.'));
    process.exit(1);
  }

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  try {
    // The Content-Type Builder always writes to the app's *source* migrations
    // dir (the database-configured dir points at build output when
    // `useTypescriptMigrations` is enabled).
    const migrationsDir = path.join(app.dirs.app.root, 'database', 'migrations');

    const before = await listMigrationFiles(migrationsDir);

    await app
      .plugin('content-type-builder')
      .service('schema')
      .renameComponent(uid, { category: newCategory, displayName });

    const after = await listMigrationFiles(migrationsDir);
    const created = [...after].filter((file) => !before.has(file));

    const changes = [
      newCategory ? `category "${newCategory}"` : null,
      displayName ? `display name "${displayName}"` : null,
    ]
      .filter(Boolean)
      .join(' and ');
    console.log(chalk.green(`Renamed component "${uid}" to ${changes}.`));

    if (created.length > 0) {
      created.forEach((file) => {
        console.log(`Generated migration ${path.join(migrationsDir, file)}`);
      });
    } else {
      console.log(
        chalk.yellow(
          'No rename migration was generated. This happens when renameMigrations is set to ' +
            '"never", or when no content-type or component embeds this component (nothing to ' +
            'migrate). The component has still been moved in the schema.'
        )
      );
    }
  } finally {
    await app.destroy();
  }
};

/**
 * `$ strapi rename:component <uid> [newCategory] [--display-name <name>]`
 */
const command: StrapiCommand = () => {
  return createCommand('rename:component')
    .arguments('<uid> [newCategory]')
    .option('--display-name <displayName>', 'New display name for the component')
    .description(
      'Move a component to a new category and/or display name (changing its uid) and generate a data-preserving migration'
    )
    .action(runAction('rename:component', action));
};

export { action, command };
