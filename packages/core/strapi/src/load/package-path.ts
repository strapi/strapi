import path from 'path';

/**
 * Returns the path to a node modules root directory (not the main file path)
 */
export default (moduleName: string) => path.dirname(require.resolve(`${moduleName}/package.json`));
