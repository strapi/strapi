import path from 'path';
import { fromFile } from '@strapi/ts-zen';

const DEFINITIONS_ROOT = path.join(__dirname, 'definitions');

export const createTypeSelector = (filePath: string) => {
  // TODO: Remove when strapi/strapi is migrated to TS
  return fromFile(path.join(DEFINITIONS_ROOT, filePath), {
    compilerOptions: { strict: true },
    ignoreProjectOptions: true,
  });
};
