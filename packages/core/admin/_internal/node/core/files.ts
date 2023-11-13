import { access } from 'node:fs/promises';
import { register } from 'esbuild-register/dist/node';

/**
 * @internal
 */
const pathExists = async (path: string) => {
  try {
    await access(path);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * @internal
 */
const loadFile = async (path: string): Promise<undefined | any> => {
  if (await pathExists(path)) {
    const esbuildOptions = { extensions: ['.js', '.mjs', '.ts'] };

    const { unregister } = register(esbuildOptions);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(path);

    unregister();

    /**
     * handles esm or cjs exporting.
     */
    const file = mod?.default || mod || undefined;

    return file;
  }

  return undefined;
};

export { pathExists, loadFile };
