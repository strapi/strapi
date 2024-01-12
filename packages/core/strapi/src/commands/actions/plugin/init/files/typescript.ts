import { TemplateFile } from '@strapi/pack-up';
import { outdent } from 'outdent';

interface TsConfigFiles {
  tsconfigFile: TemplateFile;
  tsconfigBuildFile: TemplateFile;
}

const ADMIN: TsConfigFiles = {
  tsconfigFile: {
    name: 'admin/tsconfig.json',
    contents: outdent`
        {
          "extends": "@strapi/typescript-utils/tsconfigs/admin",
          "include": ["./src", "./custom.d.ts"],
          "compilerOptions": {
            "rootDir": "../",
            "baseUrl": ".",
          },
        }
      `,
  },
  tsconfigBuildFile: {
    name: 'admin/tsconfig.build.json',
    contents: outdent`
        {
          "extends": "./tsconfig",
          "include": ["./src", "./custom.d.ts"],
          "exclude": ["**/*.test.ts", "**/*.test.tsx"],
          "compilerOptions": {
            "rootDir": "../",
            "baseUrl": ".",
            "outDir": "./dist",
          }
        }
      `,
  },
};

const SERVER: TsConfigFiles = {
  tsconfigFile: {
    name: 'server/tsconfig.json',
    contents: outdent`
        {
          "extends": "@strapi/typescript-utils/tsconfigs/server",
          "include": ["./src"],
          "compilerOptions": {
            "rootDir": "../",
            "baseUrl": ".",
          },
        }
      `,
  },
  tsconfigBuildFile: {
    name: 'server/tsconfig.build.json',
    contents: outdent`
        {
          "extends": "./tsconfig",
          "include": ["./src"],
          "exclude": ["**/*.test.ts"],
          "compilerOptions": {
            "rootDir": "../",
            "baseUrl": ".",
            "outDir": "./dist",
          }
        }
      `,
  },
};

export { ADMIN as adminTsconfigFiles, SERVER as serverTsconfigFiles };
