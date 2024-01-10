import getLatestVersion from 'get-latest-version';
import gitUrlParse from 'git-url-parse';
import { outdent } from 'outdent';

import { isError } from '../../core/errors';
import { PackageJson } from '../../core/pkg';
import { definePackageFeature, definePackageOption, defineTemplate } from '../create';
import { TemplateFile } from '../types';

import { editorConfigFile } from './files/editorConfig';
import { gitIgnoreFile } from './files/gitIgnore';
import { prettierFile, prettierIgnoreFile } from './files/prettier';

const PACKAGE_NAME_REGEXP = /^(?:@(?:[a-z0-9-*~][a-z0-9-*._~]*)\/)?[a-z0-9-~][a-z0-9-._~]*$/i;

const defaultTemplate = defineTemplate(async ({ logger, gitConfig }) => {
  let repo: {
    source?: string;
    owner?: string;
    name?: string;
  };

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
        message: 'package name',
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
        name: 'description',
        type: 'text',
        message: 'package description',
      }),
      definePackageOption({
        name: 'authorName',
        type: 'text',
        message: 'package author name',
        initial: gitConfig?.user?.name,
      }),
      definePackageOption({
        name: 'authorEmail',
        type: 'text',
        message: 'package author email',
        initial: gitConfig?.user?.email,
      }),
      definePackageOption({
        name: 'license',
        type: 'text',
        message: 'package license',
        initial: 'MIT',
        validate(v) {
          if (!v) {
            return 'license is required';
          }

          return true;
        },
      }),
      definePackageFeature({
        name: 'typescript',
        initial: true,
        optional: true,
      }),
      definePackageFeature({
        name: 'eslint',
        initial: true,
        optional: true,
      }),
    ],
    async getFiles(answers) {
      const devDepsToInstall: string[] = [];
      const author: string[] = [];
      let isTypescript = false;

      const files: TemplateFile[] = [];

      // package.json
      const pkgJson: PackageJson = {
        version: '0.0.0',
        keywords: [],
        type: 'commonjs',
        exports: {
          // @ts-expect-error yup typings are a bit weak.
          '.': {
            require: './dist/index.js',
            import: './dist/index.mjs',
            source: '',
            default: './dist/index.js',
          },
          './package.json': './package.json',
        },
        main: './dist/index.js',
        module: './dist/index.mjs',
        files: ['dist'],
        scripts: {
          check: 'pack-up check',
          build: 'pack-up build',
          watch: 'pack-up watch',
        },
        dependencies: {},
        devDependencies: {
          /**
           * We set * as a default version, but further down
           * we try to resolve each package to their latest
           * version, failing that we leave the fallback of *.
           */
          '@strapi/pack-up': '*',
          prettier: '*',
        },
      };

      if (Array.isArray(answers)) {
        for (const ans of answers) {
          const { name, answer } = ans;

          switch (name) {
            case 'pkgName': {
              pkgJson.name = String(answer);
              break;
            }
            case 'description': {
              pkgJson.description = String(answer) ?? undefined;
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
            case 'typescript': {
              isTypescript = Boolean(answer);

              pkgJson.source = isTypescript ? './src/index.ts' : './src/index.js';

              if (isRecord(pkgJson.exports['.'])) {
                pkgJson.exports['.'].source = isTypescript ? './src/index.ts' : './src/index.js';
              }

              if (isTypescript) {
                pkgJson.types = './dist/index.d.ts';

                if (isRecord(pkgJson.exports['.'])) {
                  pkgJson.exports['.'] = {
                    // @ts-expect-error it won't be overwritten.
                    types: './dist/index.d.ts',
                    ...pkgJson.exports['.'],
                  };
                }

                pkgJson.scripts = {
                  ...pkgJson.scripts,
                  'test:ts': 'tsc --build',
                };

                devDepsToInstall.push('typescript');

                const { tsconfigBuildFile, tsconfigFile } = await import('./files/typescript');

                files.push(tsconfigFile, tsconfigBuildFile);
              }

              // source
              files.push({
                name: isTypescript ? 'src/index.ts' : 'src/index.js',
                contents: outdent`
                  /**
                   * @public
                   */
                  const main = () => {
                    // silence is golden
                  }

                  export { main }
                `,
              });

              break;
            }
            case 'eslint': {
              if (answer) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const eslintConfig: any = {
                  root: true,
                  env: {
                    browser: true,
                    es6: true,
                    node: true,
                  },
                  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
                  parserOptions: {
                    ecmaVersion: 'latest',
                    sourceType: 'module',
                  },
                  plugins: ['prettier'],
                };

                if (isTypescript) {
                  eslintConfig.overrides = [
                    {
                      files: ['**/*.ts', '**/*.tsx'],
                      parser: '@typescript-eslint/parser',
                      parserOptions: {
                        project: ['./tsconfig.eslint.json'],
                      },
                      extends: [
                        'eslint:recommended',
                        'plugin:prettier/recommended',
                        'plugin:@typescript-eslint/eslint-recommended',
                        'plugin:@typescript-eslint/recommended',
                      ],
                      plugins: ['@typescript-eslint', 'prettier'],
                    },
                  ];

                  const { tsconfigEslintFile } = await import('./files/typescript');

                  // tsconfig.eslint.json
                  files.push(tsconfigEslintFile);
                }

                pkgJson.scripts = {
                  ...pkgJson.scripts,
                  lint: isTypescript
                    ? 'eslint . --ext .cjs,.js,.ts,.tsx'
                    : 'eslint . --ext .cjs,.js',
                };

                devDepsToInstall.push('eslint', 'eslint-config-prettier', 'eslint-plugin-prettier');

                if (isTypescript) {
                  devDepsToInstall.push(
                    '@typescript-eslint/eslint-plugin',
                    '@typescript-eslint/parser'
                  );
                }

                const { eslintIgnoreFile } = await import('./files/eslint');

                files.push(
                  {
                    name: '.eslintrc',
                    contents: outdent`
                    ${JSON.stringify(eslintConfig, null, 2)}
                  `,
                  },
                  eslintIgnoreFile
                );
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
        pkgJson.devDependencies = await resolveLatestVerisonOfDeps([
          ...devDepsToInstall,
          ...Object.keys(pkgJson.devDependencies),
        ]);
      } catch (err) {
        if (isError(err)) {
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

      /**
       * PRETTIER IS INSTALLED BY DEFAULT.
       */
      files.push(prettierFile, prettierIgnoreFile, editorConfigFile, gitIgnoreFile);

      return files;
    },
  };
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && !Array.isArray(value) && typeof value === 'object';

const resolveLatestVerisonOfDeps = async (deps: string[]): Promise<Record<string, string>> => {
  const latestDeps: Record<string, string> = {};

  for (const name of deps) {
    try {
      const latestVersion = await getLatestVersion(name, '*');
      latestDeps[name] = latestVersion ? `^${latestVersion}` : '*';
    } catch (err) {
      latestDeps[name] = '*';
    }
  }

  return latestDeps;
};

export { defaultTemplate };
