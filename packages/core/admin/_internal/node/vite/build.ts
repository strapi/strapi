import { build as viteBuild } from 'vite';

import { mergeConfigWithUserConfig, resolveProductionConfig } from './config';

import type { BuildContext } from '../createBuildContext';

const build = async (ctx: BuildContext) => {
  const config = await resolveProductionConfig(ctx);
  const finalConfig = await mergeConfigWithUserConfig(config, ctx);

  ctx.logger.debug('Vite config', finalConfig);

  await viteBuild(finalConfig);
};

export { build };
