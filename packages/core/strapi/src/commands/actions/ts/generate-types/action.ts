import tsUtils from '@strapi/typescript-utils';
import strapi from '../../../../Strapi';

interface CmdOptions {
  debug?: boolean;
  silent?: boolean;
  verbose?: boolean;
  outDir?: string;
}

export default async ({ debug, silent, verbose, outDir }: CmdOptions) => {
  if ((debug || verbose) && silent) {
    console.error('Flags conflict: both silent and debug mode are enabled, exiting...');
    process.exit(1);
  }

  const appContext = await strapi.compile({ ignoreDiagnostics: true });
  const app = await strapi(appContext).register();

  await tsUtils.generators.generate({
    strapi: app,
    pwd: appContext.appDir,
    rootDir: outDir ?? undefined,
    logger: {
      silent,
      // TODO V5: verbose is deprecated and should be removed
      debug: debug || verbose,
    },
    artifacts: { contentTypes: true, components: true },
  });

  await app.destroy();
};
