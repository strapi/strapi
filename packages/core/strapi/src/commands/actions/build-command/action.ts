import strapi from '../../..';
import { buildAdmin } from '../../builders';

interface CmdOptions {
  forceBuild?: boolean;
  optimization?: boolean;
}

/**
 * `$ strapi build`
 */
export const action = async ({ optimization, forceBuild = true }: CmdOptions = {}) => {
  const { appDir, distDir } = await strapi.compile();

  await buildAdmin({
    forceBuild,
    optimization,
    buildDestDir: distDir,
    srcDir: appDir,
  });
};
