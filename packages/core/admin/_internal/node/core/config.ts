import path from 'node:path';

import type { BuildContext } from '../createBuildContext';
import { loadFile } from './files';

const getUserConfig = async <TConfig>(
  fileNames: string[],
  ctx: BuildContext
): Promise<TConfig | undefined> => {
  for (const file of fileNames) {
    const filePath = path.join(ctx.appDir, 'src', 'admin', file);
    const configFile = await loadFile(filePath);

    if (configFile) {
      return configFile;
    }
  }

  return undefined;
};

export { getUserConfig };
