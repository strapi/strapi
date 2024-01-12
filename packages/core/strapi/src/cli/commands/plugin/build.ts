import { createCommand } from 'commander';
import boxen from 'boxen';
import chalk from 'chalk';
import { BuildCLIOptions, ConfigBundle, build } from '@strapi/pack-up';

import { forceOption } from '../../utils/commander';
import { runAction, notifyExperimentalCommand } from '../../utils/helpers';
import { Export, loadPkg, validatePkg } from '../../utils/pkg';
import type { CLIContext, StrapiCommand } from '../../types';

interface ActionOptions extends BuildCLIOptions {
  force?: boolean;
}

const action = async (
  { force, ...opts }: ActionOptions,
  _cmd: unknown,
  { logger, cwd }: CLIContext
) => {
  try {
    /**
     * ALWAYS set production for using plugin build CLI.
     */
    process.env.NODE_ENV = 'production';
    /**
     * Notify users this is an experimental command and get them to approve first
     * this can be opted out by setting the argument --force
     */
    await notifyExperimentalCommand('plugin:build', { force });

    const pkg = await loadPkg({ cwd, logger });
    const pkgJson = await validatePkg({ pkg });

    if (!pkgJson.exports['./strapi-admin'] && !pkgJson.exports['./strapi-server']) {
      throw new Error(
        'You need to have either a strapi-admin or strapi-server export in your package.json'
      );
    }

    const bundles: ConfigBundle[] = [];

    if (pkgJson.exports['./strapi-admin']) {
      const exp = pkgJson.exports['./strapi-admin'] as Export;

      const bundle: ConfigBundle = {
        source: exp.source,
        import: exp.import,
        require: exp.require,
        runtime: 'web',
      };

      if (exp.types) {
        bundle.types = exp.types;
        // TODO: should this be sliced from the source path...?
        bundle.tsconfig = './admin/tsconfig.build.json';
      }

      bundles.push(bundle);
    }

    if (pkgJson.exports['./strapi-server']) {
      const exp = pkgJson.exports['./strapi-server'] as Export;

      const bundle: ConfigBundle = {
        source: exp.source,
        import: exp.import,
        require: exp.require,
        runtime: 'node',
      };

      if (exp.types) {
        bundle.types = exp.types;
        // TODO: should this be sliced from the source path...?
        bundle.tsconfig = './server/tsconfig.build.json';
      }

      bundles.push(bundle);
    }

    await build({
      cwd,
      configFile: false,
      config: {
        bundles,
        dist: './dist',
        /**
         * ignore the exports map of a plugin, because we're streamlining the
         * process and ensuring the server package and admin package are built
         * with the correct runtime and their individual tsconfigs
         */
        exports: {},
      },
      ...opts,
    });
  } catch (err) {
    logger.error(
      'There seems to be an unexpected error, try again with --debug for more information \n'
    );
    if (err instanceof Error && err.stack) {
      console.log(
        chalk.red(
          boxen(err.stack, {
            padding: 1,
            align: 'left',
          })
        )
      );
    }
    process.exit(1);
  }
};

/**
 * `$ strapi plugin:build`
 */
const command: StrapiCommand = ({ ctx }) => {
  return createCommand('plugin:build')
    .description('Bundle your strapi plugin for publishing.')
    .addOption(forceOption)
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .option('--silent', "Don't log anything", false)
    .option('--sourcemap', 'produce sourcemaps', false)
    .option('--minify', 'minify the output', false)
    .action((...args) => runAction('plugin:build', action)(...args, ctx));
};

export { command };
