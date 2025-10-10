import webpack from 'webpack';

import { mergeConfigWithUserConfig, resolveProductionConfig } from './config';
import { isError } from '../core/errors';

import type { BuildContext } from '../create-build-context';

const build = async (ctx: BuildContext) => {
  const config = await resolveProductionConfig(ctx);
  const finalConfig = await mergeConfigWithUserConfig(config, ctx);

  ctx.logger.debug('Webpack config', finalConfig);

  return new Promise((resolve, reject) => {
    webpack(finalConfig, (err, stats) => {
      if (stats) {
        if (stats.hasErrors()) {
          ctx.logger.error(
            stats.toString({
              chunks: false,
              colors: true,
            })
          );

          reject();
        } else if (ctx.options.stats) {
          ctx.logger.info(
            stats.toString({
              chunks: false,
              colors: true,
            })
          );
        }

        resolve(true);
      }

      if (err && isError(err)) {
        ctx.logger.error(err.message);
        reject();
      }
    });
  });
};

export { build };
