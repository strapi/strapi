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

/**
 * Moves a component to a new category (changing its uid) and generates the
 * data-preserving migration in a single step, reusing the same rename resolver
 * the Content-Type Builder admin uses.
 */
const action = async (uid: string, newCategory: string) => {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  try {
    const migrationsDir =
      app.db.config?.settings?.migrations?.dir ??
      path.join(process.cwd(), 'database', 'migrations');

    const before = await listMigrationFiles(migrationsDir);

    await app.plugin('content-type-builder').service('schema').renameComponent(uid, newCategory);

    const after = await listMigrationFiles(migrationsDir);
    const created = [...after].filter((file) => !before.has(file));

    console.log(chalk.green(`Moved component "${uid}" to category "${newCategory}".`));

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
 * `$ strapi rename:component <uid> <newCategory>`
 */
const command: StrapiCommand = () => {
  return createCommand('rename:component <uid> <newCategory>')
    .description(
      'Move a component to a new category (changing its uid) and generate a data-preserving migration'
    )
    .action(runAction('rename:component', action));
};

export { action, command };
