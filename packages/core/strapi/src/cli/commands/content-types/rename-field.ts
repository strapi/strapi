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
    const migrationsDir =
      app.db.config?.settings?.migrations?.dir ??
      path.join(process.cwd(), 'database', 'migrations');

    const before = await listMigrationFiles(migrationsDir);

    await app
      .plugin('content-type-builder')
      .service('schema')
      .renameAttribute(uid, oldName, newName);

    const after = await listMigrationFiles(migrationsDir);
    const created = [...after].filter((file) => !before.has(file));

    console.log(chalk.green(`Renamed "${oldName}" to "${newName}" on ${uid}.`));

    if (created.length > 0) {
      created.forEach((file) => {
        console.log(`Generated migration ${path.join(migrationsDir, file)}`);
      });
    } else {
      console.log(
        chalk.yellow(
          'No rename migration was generated. This happens when renameMigrations is set to ' +
            '"never", or when the field has no data to preserve (e.g. an unsupported polymorphic ' +
            'relation). The field has still been renamed in the schema.'
        )
      );
    }
  } finally {
    await app.destroy();
  }
};

/**
 * `$ strapi rename:field <uid> <oldName> <newName>`
 */
const command: StrapiCommand = () => {
  return createCommand('rename:field <uid> <oldName> <newName>')
    .description(
      'Rename a content-type or component attribute and generate a data-preserving migration'
    )
    .action(runAction('rename:field', action));
};

export { action, command };
