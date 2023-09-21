import getLatestVersion from 'get-latest-version';
import gitUrlParse from 'git-url-parse';
import { outdent } from 'outdent';

import { parseGlobalGitConfig } from '../../core/git';
import { PackageJson } from '../../core/pkg';
import { definePackageFeature, definePackageOption, defineTemplate } from '../create';
import { TemplateFile } from '../types';

const PACKAGE_NAME_REGEXP = /^(?:@(?:[a-z0-9-*~][a-z0-9-*._~]*)\/)?[a-z0-9-~][a-z0-9-._~]*$/i;

const defaultTemplate = defineTemplate(async ({ logger }) => {
  const gitConfig = await parseGlobalGitConfig();

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
          if (!v) return true;

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
          if (!v) return 'package name is required';

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
          if (!v) return 'license is required';

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
            types: undefined,
            require: './dist/index.cjs',
            import: './dist/index.js',
            default: './dist/index.js',
          },
          './package.json': './package.json',
        },
        main: './dist/index.cjs',
        module: './dist/index.js',
        files: ['dist'],
        scripts: {
          check: 'pack-up check',
          build: 'pack-up build',
          watch: 'pack-up watch',
        },
        dependencies: {},
        devDependencies: {
          '@strapi/pack-up': '*',
          prettier: '*',
        },
      };

      if (Array.isArray(answers)) {
        for (const ans of answers) {
          const { name, answer } = ans;

          switch (name) {
            case 'pkgName': {
              pkgJson.name = answer;
              break;
            }
            case 'description': {
              pkgJson.description = answer ?? undefined;
              break;
            }
            case 'authorName': {
              author.push(answer);
              break;
            }
            case 'authorEmail': {
              if (answer) {
                author.push(`<${answer}>`);
              }
              break;
            }
            case 'license': {
              pkgJson.license = answer;
              break;
            }
            case 'typescript': {
              isTypescript = Boolean(answer === 'false' ? '' : answer);

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

                // tsconfig.json
                files.push({
                  name: 'tsconfig.json',
                  contents: outdent`
                    {
                      "include": ["src"],
                      "exclude": ["**/*.test.ts"],
                      compilerOptions: {
                        "composite": false,
                        "declaration": true,
                        "declarationMap": true,
                        "esModuleInterop": true,
                        "forceConsistentCasingInFileNames": true,
                        "inlineSources": false,
                        "isolatedModules": true,
                        "moduleResolution": "node",
                        "noEmit": true,
                        "noUnusedLocals": false,
                        "noUnusedParameters": false,
                        "preserveWatchOutput": true,
                        "skipLibCheck": true,
                        "strict": true
                      }
                    }
                  `,
                });

                // tsconfig.build.json
                files.push({
                  name: 'tsconfig.build.json',
                  contents: outdent`
                    {
                      "extends": "./tsconfig",
                      "include": ["./src"],
                      "compilerOptions": {
                        "rootDir": ".",
                        "outDir": "./dist",
                        "emitDeclarationOnly": true,
                        "noEmit": false,
                        "resolveJsonModule": true
                      }
                    }
                  `,
                });

                // source
                files.push({
                  name: 'src/index.ts',
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
              } else {
                // source
                files.push({
                  name: 'src/index.js',
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
              }

              break;
            }
            case 'eslint': {
              if (answer === 'true') {
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

                  // tsconfig.eslint.json
                  files.push({
                    name: 'tsconfig.eslint.json',
                    contents: outdent`
                      {
                        "extends": "./tsconfig",
                        "include": ["src", "*.ts", "*.js"],
                      }
                    `,
                  });
                }

                // .eslintignore
                files.push({
                  name: '.eslintignore',
                  contents: outdent`
                  dist
                  `,
                });

                pkgJson.scripts = {
                  ...pkgJson.scripts,
                  lint: isTypescript
                    ? 'eslint . --ext .cjs,.js,.ts,.tsx'
                    : 'eslint . --ext .cjs,.js',
                };

                devDepsToInstall.push('eslint', 'eslint-plugin-prettier');

                if (isTypescript) {
                  devDepsToInstall.push(
                    '@typescript-eslint/eslint-plugin',
                    '@typescript-eslint/parser'
                  );
                }

                // .eslintrc
                files.push({
                  name: '.eslintrc',
                  contents: outdent`
                    ${JSON.stringify(eslintConfig, null, 2)}
                  `,
                });
              }

              break;
            }
            default:
              break;
          }
        }
      }

      /**
       * PRETTIER IS INSTALLED BY DEFAULT.
       */
      // .prettierrc
      files.push({
        name: '.prettierrc',
        contents: outdent`
          {
            endOfLine: 'lf'
            tabWidth: 2,
            printWidth: 100,
            singleQuote: true,
            trailingComma: 'es5',
          }
        `,
      });

      // .prettierignore
      files.push({
        name: '.prettierignore',
        contents: outdent`
          dist
          coverage
        `,
      });
      /**
       * END OF PRETTIER
       */

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

      // .editorconfig
      files.push({
        name: '.editorconfig',
        contents: outdent`
        root = true

        [*]
        indent_style = space
        indent_size = 2
        end_of_line = lf
        charset = utf-8
        trim_trailing_whitespace = true
        insert_final_newline = true
        
        [{package.json,*.yml}]
        indent_style = space
        indent_size = 2
        
        [*.md]
        trim_trailing_whitespace = false
        `,
      });

      // .gitignore
      files.push({
        name: '.gitignore',
        contents: outdent`
        # See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

        # dependencies
        node_modules
        .pnp
        .pnp.js
        
        # testing
        coverage
        
        # production
        dist
        
        # misc
        .DS_Store
        *.pem
        
        # debug
        npm-debug.log*
        yarn-debug.log*
        yarn-error.log*
        
        # local env files
        .env
        .env.local
        .env.development.local
        .env.test.local
        .env.production.local        
        `,
      });

      try {
        pkgJson.devDependencies = await resolveLatestVerisonOfDeps([
          ...devDepsToInstall,
          ...Object.keys(pkgJson.devDependencies),
        ]);
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
