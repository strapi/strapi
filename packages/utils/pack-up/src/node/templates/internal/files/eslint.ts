import { outdent } from 'outdent';

import type { TemplateFile } from '../../types';

const eslintIgnoreFile: TemplateFile = {
  name: '.eslintignore',
  contents: outdent`
      dist
    `,
};

export { eslintIgnoreFile };
