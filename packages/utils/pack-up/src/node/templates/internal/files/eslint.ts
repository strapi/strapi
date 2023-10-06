import { outdent } from 'outdent';

import { TemplateFile } from '../../types';

const eslintIgnoreFile: TemplateFile = {
  name: '.eslintignore',
  contents: outdent`
      dist
    `,
};

export { eslintIgnoreFile };
