import path from 'node:path';

export const INTERNAL_CODEMODS_DIRECTORY = path.join(
  __dirname,
  '..',
  '..',
  'resources',
  'codemods'
);
