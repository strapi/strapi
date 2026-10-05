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
 * Renames an attribute on a content-type or component and generates the
 * data-preserving migration in a single step, reusing the same rename resolver
 * the Content-Type Builder admin uses.
 */
const action = async (uid: string, oldName: string, newName: string) => {
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
      .renameAttribute(uid, oldName, newName);

    const after = await listMigrationFiles(migrationsDir);
    const created = [...after].filter((file) => !before.has(file));

    // The service refuses renames it cannot migrate before touching the schema,
    // so a rename without a migration file means something went wrong.
    if (created.length === 0) {
      throw new Error(
        `Renamed "${oldName}" to "${newName}" on ${uid}, but no rename migration was written to ${migrationsDir}. Check the schema file before restarting.`
      );
    }

    console.log(chalk.green(`Renamed "${oldName}" to "${newName}" on ${uid}.`));

    created.forEach((file) => {
      console.log(`Generated migration ${path.join(migrationsDir, file)}`);
    });
  } finally {
    await app.destroy();
  }
};

/**
 * `$ strapi rename:field <uid> <oldName> <newName>`
 */
const command: StrapiCommand = () => {
  return createCommand('rename:field')
    .arguments('<uid> <oldName> <newName>')
    .description(
      'Rename a content-type or component attribute and generate a data-preserving migration'
    )
    .action(runAction('rename:field', action));
};

export { action, command };
