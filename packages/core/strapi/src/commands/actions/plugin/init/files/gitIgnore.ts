import { TemplateFile } from '@strapi/pack-up';
import { outdent } from 'outdent';

const gitIgnoreFile: TemplateFile = {
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
    `,
};

export { gitIgnoreFile };
