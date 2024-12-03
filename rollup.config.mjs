import path from 'node:path';
import { glob } from 'glob';

export default async function () {
  const files = await glob('./packages/**/rollup.config.mjs', {
    ignore: ['**/node_modules/**'],
  });

  const configs = await Promise.all(
    files.map(async (file) => {
      const { default: config } = await import(path.resolve(file));
      return config;
    })
  );

  return configs.flatMap((config) => config);
}
