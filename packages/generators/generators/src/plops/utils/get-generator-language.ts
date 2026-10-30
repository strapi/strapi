import { dirname, join } from 'node:path';
import { isUsingTypeScriptSync } from '@strapi/typescript-utils';
import type { NodePlopAPI } from 'plop';

type GetGeneratorLanguageOptions = {
  plugin?: string;
  filePath: string;
};

/**
 * Detect whether generated files should use TypeScript or JavaScript templates.
 *
 * For plugin generation, the check is scoped to the plugin server directory derived
 * from the generator output path. For everything else, it checks the `dir` option
 * passed to `generate()` (via `getDestBasePath()`).
 */
const getGeneratorLanguage = (
  { plugin, filePath }: GetGeneratorLanguageOptions,
  plop: Pick<NodePlopAPI, 'getDestBasePath'>
): 'ts' | 'js' => {
  if (plugin) {
    const resolvedFilePath = filePath.replace('{{ plugin }}', plugin);
    const pluginServerDir = join(plop.getDestBasePath(), resolvedFilePath, '..');

    return isUsingTypeScriptSync(pluginServerDir) ? 'ts' : 'js';
  }

  return isUsingTypeScriptSync(dirname(plop.getDestBasePath())) ? 'ts' : 'js';
};

export default getGeneratorLanguage;
