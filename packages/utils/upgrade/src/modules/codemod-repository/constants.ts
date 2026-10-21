import path from 'node:path';

export const INTERNAL_CODEMODS_DIRECTORY = path.join(
  __dirname, // upgrade/dist/modules/codemod-repository
  '..', // upgrade/dist/modules
  '..', // upgrade/dist
  '..', // upgrade
  'resources', // resources
  'codemods' // resources/codemods
);
