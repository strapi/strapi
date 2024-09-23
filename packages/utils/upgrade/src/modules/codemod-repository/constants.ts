import path from 'node:path';

export const INTERNAL_CODEMODS_DIRECTORY = path.join(
  __dirname, // upgrade/dist
  '..', // upgrade
  'resources', // upgrade/resources
  'codemods' // upgrade/resources/codemods
);
