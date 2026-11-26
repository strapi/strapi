import { mergeConfigWithUserConfig, resolveProductionConfig } from './config';

import type { BuildContext } from '../create-build-context';

const build = async (ctx: BuildContext) => {
  const config = await resolveProductionConfig(ctx);
  const finalConfig = await mergeConfigWithUserConfig(config, ctx);

  // Imported dynamically so this file's CJS build resolves Vite's ESM Node API instead of
  // its CJS entry, which emits "The CJS build of Vite's Node API is deprecated".
  // https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated
  const { build: viteBuild } = await import('vite');

  ctx.logger.debug('Vite config', finalConfig);

  await viteBuild(finalConfig);
};

export { build };
