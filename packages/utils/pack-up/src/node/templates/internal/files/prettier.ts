import { outdent } from 'outdent';

import type { TemplateFile } from '../../types';

const prettierFile: TemplateFile = {
  name: '.prettierrc',
  contents: outdent`
      {
        "endOfLine": 'lf',
        "tabWidth": 2,
        "printWidth": 100,
        "singleQuote": true,
        "trailingComma": 'es5',
      }
    `,
};

const prettierIgnoreFile: TemplateFile = {
  name: '.prettierignore',
  contents: outdent`
      dist
      coverage
    `,
};

export { prettierFile, prettierIgnoreFile };
