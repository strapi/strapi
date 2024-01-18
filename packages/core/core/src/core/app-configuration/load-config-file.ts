import path from 'path';
import fs from 'fs';
import { templateConfiguration, env, importDefault } from '@strapi/utils';
import { register } from 'esbuild-register/dist/node';

const loadJsFile = (file: string) => {
  try {
    // In typescript projects, we don't need to compile the ts to js, so we can
    const esbuildOptions: Parameters<typeof register>[0] = {
      extensions: ['.js', '.mjs', '.ts'],
    };
    const { unregister } = register(esbuildOptions);
    const jsModule = importDefault(file);
    unregister();

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
    return templateConfiguration(JSON.parse(fs.readFileSync(file).toString()));
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Could not load json config file ${file}: ${error.message}`);
    }

    throw new Error('Unknown error');
  }
};

export const loadFile = (file: string) => {
  const ext = path.extname(file);

  switch (ext) {
    case '.js':
    case '.ts':
      return loadJsFile(file);
    case '.json':
      return loadJSONFile(file);
    default:
      return {};
  }
};
