import path from 'path';
import fs from 'fs';
import { env, importDefault } from '@strapi/utils';

const loadJsFile = (file: string) => {
  try {
    const jsModule = importDefault(file);

    // call if function
    if (typeof jsModule === 'function') {
      return jsModule({ env });
    }

    return jsModule;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Could not load js config file ${file}: ${error.message}`);
    }

    throw new Error('Unknown error');
  }
};

const loadJSONFile = (file: string) => {
  try {
    return JSON.parse(fs.readFileSync(file).toString());
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Could not load json config file ${file}: ${error.message}`);
    }

    throw new Error('Unknown error');
  }
};

export const loadConfigFile = (file: string) => {
  const ext = path.extname(file);

  switch (ext) {
    case '.js':
      return loadJsFile(file);
    case '.json':
      return loadJSONFile(file);
    default:
      return {};
  }
};
