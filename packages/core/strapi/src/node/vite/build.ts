import { mergeConfigWithUserConfig, resolveProductionConfig } from './config';

import type { BuildContext } from '../create-build-context';

const build = async (ctx: BuildContext) => {
  const config = await resolveProductionConfig(ctx);
  const finalConfig = await mergeConfigWithUserConfig(config, ctx);

  const { build: viteBuild } = await import('vite');

  ctx.logger.debug('Vite config', finalConfig);

  await viteBuild(finalConfig);
};

export { build };
