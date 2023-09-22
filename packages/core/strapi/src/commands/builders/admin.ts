import chalk from 'chalk';

import strapiAdmin from '@strapi/admin';
import { getConfigUrls } from '@strapi/utils';

import ee from '../../utils/ee';
import addSlash from '../../utils/addSlash';
import strapi from '../../index';
import { getEnabledPlugins } from '../../core/loaders/plugins/get-enabled-plugins';

export interface Options {
  buildDestDir: string;
  forceBuild?: boolean;
  optimization?: boolean;
  srcDir: string;
}

export default async ({ buildDestDir, forceBuild = true, optimization, srcDir }: Options) => {
  const strapiInstance = strapi({
    // Directories
    appDir: srcDir,
    distDir: buildDestDir,
    // Options
    autoReload: true,
    serveAdminPanel: false,
  });

  const plugins = await getEnabledPlugins(strapiInstance, { client: true });

  const env = strapiInstance.config.get('environment');
  const { serverUrl, adminPath } = getConfigUrls(strapiInstance.config, true);

  console.log(`Building your admin UI with ${chalk.green(env)} configuration...`);

  // Always remove the .cache and build folders
  await strapiAdmin.clean({ appDir: srcDir, buildDestDir });

  ee.init(srcDir);

  return strapiAdmin
    .build({
      appDir: srcDir,
      buildDestDir,
      // front end build env is always production for now
      env: 'production',
      forceBuild,
      plugins,
      optimize: optimization,
      options: {
        backend: serverUrl,
        adminPath: addSlash(adminPath),
        telemetryIsDisabled: strapiInstance.telemetry.isDisabled,
      },
    })
    .then(() => {
      console.log('Admin UI built successfully');
    })
    .catch((err: NodeJS.ErrnoException) => {
      console.error(err);
      process.exit(1);
    });
};
