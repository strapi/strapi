import { TemplateFile } from '@strapi/pack-up';
import { outdent } from 'outdent';

const eslintIgnoreFile: TemplateFile = {
  name: '.eslintignore',
  contents: outdent`
      dist
    `,
};

export { eslintIgnoreFile };
