import { createCommand } from 'commander';
import fs from 'fs';
import _ from 'lodash';
import { createStrapi, compileStrapi } from '@strapi/core';
import type { Database } from '@strapi/database';

import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';

type Strategy = 'replace' | 'merge' | 'keep';

interface CmdOptions {
  file?: string;
  strategy?: Strategy;
}

/**
 * Will restore configurations. It reads from a file or stdin
 */
const action = async ({ file: filePath, strategy = 'replace' }: CmdOptions) => {
  const input = filePath ? fs.readFileSync(filePath) : await readStdin();

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  let dataToImport;
  try {
    dataToImport = JSON.parse(_.toString(input));
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid input data: ${error.message}. Expected a valid JSON array.`);
    }

    throw error;
  }

  if (!Array.isArray(dataToImport)) {
    throw new Error(`Invalid input data. Expected a valid JSON array.`);
  }

  if (!app.db) {
    throw new Error('Cannot import configuration without a database connection.');
  }

  const importer = createImporter(app.db, strategy);

  for (const config of dataToImport) {
    await importer.import(config);
  }

  console.log(
    `Successfully imported configuration with ${strategy} strategy. Statistics: ${importer.printStatistics()}.`
  );

  process.exit(0);
};

const readStdin = () => {
  const { stdin } = process;
  let result = '';

  if (stdin.isTTY) return Promise.resolve(result);

  return new Promise((resolve, reject) => {
    stdin.setEncoding('utf8');
    stdin.on('readable', () => {
      let chunk;
      // eslint-disable-next-line no-cond-assign
      while ((chunk = stdin.read())) {
        result += chunk;
      }
    });

    stdin.on('end', () => {
      resolve(result);
    });

    stdin.on('error', reject);
  });
};

const createImporter = (db: Database, strategy?: Strategy) => {
  switch (strategy) {
    case 'replace':
      return createReplaceImporter(db);
    case 'merge':
      return createMergeImporter(db);
    case 'keep':
      return createKeepImporter(db);
    default:
      throw new Error(`No importer available for strategy "${strategy}"`);
  }
};

/**
 * Replace importer. Will replace the keys that already exist and create the new ones
 */
const createReplaceImporter = (db: Database) => {
  const stats = {
    created: 0,
    replaced: 0,
  };

  return {
    printStatistics() {
      return `${stats.created} created, ${stats.replaced} replaced`;
    },

    async import(conf: Record<string, unknown>) {
      const matching = await db.query('strapi::core-store').count({ where: { key: conf.key } });
      if (matching > 0) {
        stats.replaced += 1;
        await db.query('strapi::core-store').update({
          where: { key: conf.key },
          data: conf,
        });
      } else {
        stats.created += 1;
        await db.query('strapi::core-store').create({ data: conf });
      }
    },
  };
};

/**
 * Merge importer. Will merge the keys that already exist with their new value and create the new ones
 */
const createMergeImporter = (db: Database) => {
  const stats = {
    created: 0,
    merged: 0,
  };

  return {
    printStatistics() {
      return `${stats.created} created, ${stats.merged} merged`;
    },

    async import(conf: Record<string, unknown>) {
      const existingConf = await db
        .query('strapi::core-store')
        .findOne({ where: { key: conf.key } });

      if (existingConf) {
        stats.merged += 1;
        await db.query('strapi::core-store').update({
          where: { key: conf.key },
          data: _.merge(existingConf, conf),
        });
      } else {
        stats.created += 1;
        await db.query('strapi::core-store').create({ data: conf });
      }
    },
  };
};

/**
 * Merge importer. Will keep the keys that already exist without changing them and create the new ones
 */
const createKeepImporter = (db: Database) => {
  const stats = {
    created: 0,
    untouched: 0,
  };

  return {
    printStatistics() {
      return `${stats.created} created, ${stats.untouched} untouched`;
    },

    async import(conf: Record<string, unknown>) {
      const matching = await db.query('strapi::core-store').count({ where: { key: conf.key } });
      if (matching > 0) {
        stats.untouched += 1;
        // if configuration already exists do not overwrite it
        return;
      }

      stats.created += 1;
      await db.query('strapi::core-store').create({ data: conf });
    },
  };
};

/**
 * `$ strapi configuration:restore`
 */
const command: StrapiCommand = () => {
  return createCommand('configuration:restore')
    .alias('config:restore')
    .description('Restore configurations of your application')
    .option('-f, --file <file>', 'Input file, default input is stdin')
    .option('-s, --strategy <strategy>', 'Strategy name, one of: "replace", "merge", "keep"')
    .action(runAction('configuration:restore', action));
};

export { action, command };
