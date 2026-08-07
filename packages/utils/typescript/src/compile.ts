import * as compilers from './compilers';
import { getConfigPath } from './utils/get-config-path';
import type { ConfigOptions } from './compilers/basic';

export const compile = async (
  srcDir: string,
  { configOptions = {}, tsconfigPath }: { configOptions?: ConfigOptions; tsconfigPath?: string }
): Promise<void> => {
  const configPath = getConfigPath(srcDir, { filename: tsconfigPath });

  compilers.basic.run(configPath as string, configOptions);
};
