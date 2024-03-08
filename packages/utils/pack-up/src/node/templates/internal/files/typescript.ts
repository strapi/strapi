import { outdent } from 'outdent';

import type { TemplateFile } from '../../types';

const tsconfigFile: TemplateFile = {
  name: 'tsconfig.json',
  contents: outdent`
      {
        "include": ["src"],
        "exclude": ["**/*.test.ts"],
        "compilerOptions": {
          "composite": false,
          "declaration": true,
          "declarationMap": true,
          "esModuleInterop": true,
          "forceConsistentCasingInFileNames": true,
          "inlineSources": false,
          "isolatedModules": true,
          "moduleResolution": "Bundler",
          "module": "ESNext",
          "noEmit": true,
          "noUnusedLocals": false,
          "noUnusedParameters": false,
          "preserveWatchOutput": true,
          "skipLibCheck": true,
          "strict": true
        }
      }
    `,
};

const tsconfigBuildFile: TemplateFile = {
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
};

const tsconfigEslintFile: TemplateFile = {
  name: 'tsconfig.eslint.json',
  contents: outdent`
      {
        "extends": "./tsconfig",
        "include": ["src", "*.ts", "*.js"],
      }
    `,
};

export { tsconfigFile, tsconfigBuildFile, tsconfigEslintFile };
