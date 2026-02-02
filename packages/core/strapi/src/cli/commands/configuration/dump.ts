import fs from 'fs';
import { createCommand } from 'commander';
import { createStrapi, compileStrapi } from '@strapi/core';

import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';

interface CmdOptions {
  file?: string;
  pretty?: boolean;
}

interface ExportItem {
  key: string;
  value: string;
  type: string;
  environment: string;
  tag: string;
}

interface Output {
  write(str: string): void;
  end(): void;
}

const CHUNK_SIZE = 100;

/**
 * Will dump configurations to a file or stdout
 * @param {string} file filepath to use as output
 */
const action = async ({ file: filePath, pretty }: CmdOptions) => {
  const output: Output = filePath ? fs.createWriteStream(filePath) : process.stdout;

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  const count = await app.query('strapi::core-store').count();

  const exportData: ExportItem[] = [];

  const pageCount = Math.ceil(count / CHUNK_SIZE);

  for (let page = 0; page < pageCount; page += 1) {
    const results = await app
      .query('strapi::core-store')
      .findMany({ limit: CHUNK_SIZE, offset: page * CHUNK_SIZE, orderBy: 'key' });

    results
      .filter((result) => result.key.startsWith('plugin_'))
      .forEach((result) => {
        exportData.push({
          key: result.key,
          value: result.value,
          type: result.type,
          environment: result.environment,
          tag: result.tag,
        });
      });
  }

  const str = JSON.stringify(exportData, null, pretty ? 2 : undefined);

  output.write(str);
  output.write('\n');
  output.end();

  // log success only when writting to file
  if (filePath) {
    console.log(`Successfully exported ${exportData.length} configuration entries`);
  }
  process.exit(0);
};

/**
 * `$ strapi configuration:dump`
 */
const command: StrapiCommand = () => {
  return createCommand('configuration:dump')
    .alias('config:dump')
    .description('Dump configurations of your application')
    .option('-f, --file <file>', 'Output file, default output is stdout')
    .option('-p, --pretty', 'Format the output JSON with indentation and line breaks', false)
    .action(runAction('configuration:dump', action));
};

export { action, command };
