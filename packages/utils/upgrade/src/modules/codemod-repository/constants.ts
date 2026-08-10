import path from 'node:path';

export const INTERNAL_RESOURCES_DIRECTORY = path.join(
  __dirname, // upgrade/dist/src/modules/codemod-repository
  '..', // upgrade/dist/src/modules
  '..', // upgrade/dist/src
  '..', // upgrade/dist
  '..', // upgrade
  'resources' // resources
);

export const INTERNAL_CODEMODS_DIRECTORY = path.join(
  INTERNAL_RESOURCES_DIRECTORY,
  'codemods' // resources/codemods
);
