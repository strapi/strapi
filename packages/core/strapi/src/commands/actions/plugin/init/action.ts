import path from 'node:path';
import boxen from 'boxen';
import chalk from 'chalk';
import getLatestVersion from 'get-latest-version';
import gitUrlParse from 'git-url-parse';
import {
  InitOptions,
  definePackageFeature,
  definePackageOption,
  defineTemplate,
  init,
  TemplateFile,
} from '@strapi/pack-up';
import { outdent } from 'outdent';
import { notifyExperimentalCommand } from '../../../utils/helpers';

import { CLIContext } from '../../../types';
import { gitIgnoreFile } from './files/gitIgnore';

interface ActionOptions extends Pick<InitOptions, 'silent' | 'debug'> {}

export default async (
  packagePath: string,
  { silent, debug }: ActionOptions,
  { logger, cwd }: CLIContext
) => {
  try {
    /**
     * Notify users this is an experimental command. We don't need to get them to approve first.
     */
    await notifyExperimentalCommand('plugin:init', { force: true });

    /**
     * Create the package // plugin
     */
    await init({
      path: packagePath,
      cwd,
      silent,
      debug,
      template: PLUGIN_TEMPLATE,
    });

    logger.info("Don't forget to enable your plugin in your configuration files.");
  } catch (err) {
    logger.error(
      'There seems to be an unexpected error, try again with --debug for more information \n'
    );
    if (err instanceof Error && err.stack) {
      logger.log(
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

const PACKAGE_NAME_REGEXP = /^(?:@(?:[a-z0-9-*~][a-z0-9-*._~]*)\/)?[a-z0-9-~][a-z0-9-._~]*$/i;

interface PackageExport {
  types?: string;
  require: string;
  import: string;
  source: string;
  default: string;
}

interface PluginPackageJson {
  name?: string;
  description?: string;
  version?: string;
  keywords?: string[];
  type: 'commonjs';
  license?: string;
  repository?: {
    type: 'git';
    url: string;
  };
  bugs?: {
    url: string;
  };
  homepage?: string;
  author?: string;
  exports: {
    './strapi-admin'?: PackageExport;
    './strapi-server'?: PackageExport;
    './package.json': `${string}.json`;
  };
  files: string[];
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  strapi: {
    name?: string;
    displayName?: string;
    description?: string;
    kind: 'plugin';
  };
}

const PLUGIN_TEMPLATE = defineTemplate(async ({ logger, gitConfig, packagePath }) => {
  let repo: {
    source?: string;
    owner?: string;
    name?: string;
  };

  const [packageFolder] = packagePath.split(path.sep).slice(-1);

  return {
    prompts: [
      definePackageOption({
        name: 'repo',
        type: 'text',
        message: 'git url',
        validate(v) {
          if (!v) {
            return true;
          }

          try {
            const result = gitUrlParse(v);

            repo = { source: result.source, owner: result.owner, name: result.name };

            return true;
          } catch (err) {
            return 'invalid git url';
          }
        },
      }),
      definePackageOption({
        name: 'pkgName',
        type: 'text',
        message: 'plugin name',
        initial: () => repo?.name ?? '',
        validate(v) {
          if (!v) {
            return 'package name is required';
          }

          const match = PACKAGE_NAME_REGEXP.exec(v);

          if (!match) {
            return 'invalid package name';
          }

          return true;
        },
      }),
      definePackageOption({
        name: 'displayName',
        type: 'text',
        message: 'plugin display name',
      }),
      definePackageOption({
        name: 'description',
        type: 'text',
        message: 'plugin description',
      }),
      definePackageOption({
        name: 'authorName',
        type: 'text',
        message: 'plugin author name',
        initial: gitConfig?.user?.name,
      }),
      definePackageOption({
        name: 'authorEmail',
        type: 'text',
        message: 'plugin author email',
        initial: gitConfig?.user?.email,
      }),
      definePackageOption({
        name: 'license',
        type: 'text',
        message: 'plugin license',
        initial: 'MIT',
        validate(v) {
          if (!v) {
            return 'license is required';
          }

          return true;
        },
      }),
      definePackageOption({
        name: 'client-code',
        type: 'confirm',
        message: 'register with the admin panel?',
        initial: true,
      }),
      definePackageOption({
        name: 'server-code',
        type: 'confirm',
        message: 'register with the server?',
        initial: true,
      }),
      definePackageFeature({
        name: 'editorconfig',
        initial: true,
        optional: true,
      }),
      definePackageFeature({
        name: 'eslint',
        initial: true,
        optional: true,
      }),
      definePackageFeature({
        name: 'prettier',
        initial: true,
        optional: true,
      }),
      definePackageFeature({
        name: 'typescript',
        initial: true,
        optional: true,
      }),
    ],
    async getFiles(answers) {
      const author: string[] = [];

      const files: TemplateFile[] = [];

      // package.json
      const pkgJson: PluginPackageJson = {
        version: '0.0.0',
        keywords: [],
        type: 'commonjs',
        exports: {
          './package.json': './package.json',
        },
        files: ['dist'],
        scripts: {
          build: 'strapi plugin:build',
          watch: 'strapi plugin:watch',
          'watch:link': 'strapi plugin:watch:link',
          verify: 'strapi plugin:verify',
        },
        dependencies: {},
        devDependencies: {
          /**
           * We set * as a default version, but further down
           * we try to resolve each package to their latest
           * version, failing that we leave the fallback of *.
           */
          '@strapi/strapi': '*',
          prettier: '*',
        },
        peerDependencies: {
          '@strapi/strapi': '^4.0.0',
        },
        strapi: {
          kind: 'plugin',
        },
      };

      if (Array.isArray(answers)) {
        for (const ans of answers) {
          const { name, answer } = ans;

          switch (name) {
            case 'pkgName': {
              pkgJson.name = String(answer);
              pkgJson.strapi.name = String(answer);
              break;
            }
            case 'description': {
              pkgJson.description = String(answer) ?? undefined;
              pkgJson.strapi.description = String(answer) ?? undefined;
              break;
            }
            case 'displayName': {
              pkgJson.strapi.displayName = String(answer) ?? undefined;
              break;
            }
            case 'authorName': {
              author.push(String(answer));
              break;
            }
            case 'authorEmail': {
              if (answer) {
                author.push(`<${answer}>`);
              }
              break;
            }
            case 'license': {
              pkgJson.license = String(answer);
              break;
            }
            case 'client-code': {
              if (answer) {
                pkgJson.exports['./strapi-admin'] = {
                  source: './admin/src/index.js',
                  import: './dist/admin/index.mjs',
                  require: './dist/admin/index.js',
                  default: './dist/admin/index.js',
                };

                pkgJson.dependencies = {
                  ...pkgJson.dependencies,
                  '@strapi/helper-plugin': '*',
                  '@strapi/design-system': '*',
                  '@strapi/icons': '*',
                };

                pkgJson.devDependencies = {
                  ...pkgJson.devDependencies,
                  react: '*',
                  'react-dom': '*',
                  'react-router-dom': '5.3.4',
                  'styled-components': '5.3.3',
                };

                pkgJson.peerDependencies = {
                  ...pkgJson.peerDependencies,
                  react: '^17.0.0 || ^18.0.0',
                  'react-dom': '^17.0.0 || ^18.0.0',
                  'react-router-dom': '5.2.0',
                  'styled-components': '5.2.1',
                };
              }

              break;
            }
            case 'server-code': {
              if (answer) {
                pkgJson.exports['./strapi-server'] = {
                  source: './server/src/index.js',
                  import: './dist/server/index.mjs',
                  require: './dist/server/index.js',
                  default: './dist/server/index.js',
                };

                pkgJson.files.push('./strapi-server.js');

                files.push({
                  name: 'strapi-server.js',
                  contents: outdent`
                      'use strict';
  
                      module.exports = require('./dist/server');
                  `,
                });
              }

              break;
            }
            case 'typescript': {
              const isTypescript = Boolean(answer);

              if (isTypescript) {
                if (isRecord(pkgJson.exports['./strapi-admin'])) {
                  pkgJson.exports['./strapi-admin'].source = './admin/src/index.ts';

                  pkgJson.exports['./strapi-admin'] = {
                    types: './dist/admin/src/index.d.ts',
                    ...pkgJson.exports['./strapi-admin'],
                  };

                  pkgJson.scripts = {
                    ...pkgJson.scripts,
                    'test:ts:front': 'run -T tsc -p admin/tsconfig.json',
                  };

                  pkgJson.devDependencies = {
                    ...pkgJson.devDependencies,
                    '@types/react': '*',
                    '@types/react-dom': '*',
                    '@types/react-router-dom': '5.3.3',
                    '@types/styled-components': '5.1.32',
                  };

                  const { adminTsconfigFiles } = await import('./files/typescript');

                  files.push(adminTsconfigFiles.tsconfigBuildFile, adminTsconfigFiles.tsconfigFile);
                }

                if (isRecord(pkgJson.exports['./strapi-server'])) {
                  pkgJson.exports['./strapi-server'].source = './server/src/index.ts';

                  pkgJson.exports['./strapi-server'] = {
                    types: './dist/server/src/index.d.ts',
                    ...pkgJson.exports['./strapi-server'],
                  };

                  pkgJson.scripts = {
                    ...pkgJson.scripts,
                    'test:ts:back': 'run -T tsc -p server/tsconfig.json',
                  };

                  const { serverTsconfigFiles } = await import('./files/typescript');

                  files.push(
                    serverTsconfigFiles.tsconfigBuildFile,
                    serverTsconfigFiles.tsconfigFile
                  );
                }

                pkgJson.devDependencies = {
                  ...pkgJson.devDependencies,
                  '@strapi/typescript-utils': '*',
                  typescript: '*',
                };
              }

              /**
               * This is where we add all the source files regardless
               * of whether they are typescript or javascript.
               */
              if (isRecord(pkgJson.exports['./strapi-admin'])) {
                files.push({
                  name: isTypescript ? 'admin/src/pluginId.ts' : 'admin/src/pluginId.js',
                  contents: outdent`
                    export const PLUGIN_ID = '${pkgJson.name!.replace(/^strapi-plugin-/i, '')}';
                  `,
                });

                if (isTypescript) {
                  const { adminTypescriptFiles } = await import('./files/admin');

                  files.push(...adminTypescriptFiles);
                } else {
                  const { adminJavascriptFiles } = await import('./files/admin');

                  files.push(...adminJavascriptFiles);
                }
              }

              if (isRecord(pkgJson.exports['./strapi-server'])) {
                if (isTypescript) {
                  const { serverTypescriptFiles } = await import('./files/server');

                  files.push(...serverTypescriptFiles(packageFolder));
                } else {
                  const { serverJavascriptFiles } = await import('./files/server');

                  files.push(...serverJavascriptFiles(packageFolder));
                }
              }

              break;
            }
            case 'eslint': {
              if (answer) {
                const { eslintIgnoreFile } = await import('./files/eslint');

                files.push(eslintIgnoreFile);
              }

              break;
            }
            case 'prettier': {
              if (answer) {
                const { prettierFile, prettierIgnoreFile } = await import('./files/prettier');

                files.push(prettierFile, prettierIgnoreFile);
              }
              break;
            }
            case 'editorconfig': {
              if (answer) {
                const { editorConfigFile } = await import('./files/editorConfig');

                files.push(editorConfigFile);
              }
              break;
            }
            default:
              break;
          }
        }
      }

      if (repo) {
        pkgJson.repository = {
          type: 'git',
          url: `git+ssh://git@${repo.source}/${repo.owner}/${repo.name}.git`,
        };
        pkgJson.bugs = {
          url: `https://${repo.source}/${repo.owner}/${repo.name}/issues`,
        };
        pkgJson.homepage = `https://${repo.source}/${repo.owner}/${repo.name}#readme`;
      }

      pkgJson.author = author.filter(Boolean).join(' ') ?? undefined;

      try {
        pkgJson.devDependencies = await resolveLatestVerisonOfDeps(pkgJson.devDependencies);
        pkgJson.dependencies = await resolveLatestVerisonOfDeps(pkgJson.dependencies);
        pkgJson.peerDependencies = await resolveLatestVerisonOfDeps(pkgJson.peerDependencies);
      } catch (err) {
        if (err instanceof Error) {
          logger.error(err.message);
        } else {
          logger.error(err);
        }
      }

      files.push({
        name: 'package.json',
        contents: outdent`
            ${JSON.stringify(pkgJson, null, 2)}
          `,
      });

      files.push({
        name: 'README.md',
        contents: outdent`
            # ${pkgJson.name}

            ${pkgJson.description ?? ''}
        `,
      });

      files.push(gitIgnoreFile);

      return files;
    },
  };
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && !Array.isArray(value) && typeof value === 'object';

const resolveLatestVerisonOfDeps = async (
  deps: Record<string, string>
): Promise<Record<string, string>> => {
  const latestDeps: Record<string, string> = {};

  for (const [name, version] of Object.entries(deps)) {
    try {
      const latestVersion = await getLatestVersion(name, version);
      latestDeps[name] = latestVersion ? `^${latestVersion}` : '*';
    } catch (err) {
      latestDeps[name] = '*';
    }
  }

  return latestDeps;
};
