import path from 'node:path';

export const INTERNAL_CODEMODS_DIRECTORY = path.join(
  __dirname, // upgrade/dist/src/modules/codemod-repository
  '..', // upgrade/dist/src/modules
  '..', // upgrade/dist/src
  '..', // upgrade/dist
  '..', // upgrade
  'resources', // resources
  'codemods' // resources/codemods
);
