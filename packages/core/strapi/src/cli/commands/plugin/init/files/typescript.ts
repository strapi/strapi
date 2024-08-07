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
          "compilerOptions: {
            target: 'ESNext',
            module: 'ESNext',
            moduleResolution: 'Bundler',
            useDefineForClassFields: true,
            lib: ['DOM', 'DOM.Iterable', 'ESNext'],
            allowJs: false,
            skipLibCheck: true,
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            strict: true,
            forceConsistentCasingInFileNames: true,
            resolveJsonModule: true,
            noEmit: true,
            jsx: 'react-jsx',
          },
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
          "include": ["./src"],
          "compilerOptions": {
            "rootDir": "../",
            "baseUrl": ".",
            "module": "CommonJS",
            "moduleResolution": "Node",
            "lib": ["ES2020"],
            "target": "ES2019",

            "strict": false,
            "skipLibCheck": true,
            "forceConsistentCasingInFileNames": true,

            "incremental": true,
            "esModuleInterop": true,
            "resolveJsonModule": true,
            "noEmitOnError": true,
            "noImplicitThis": true
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
