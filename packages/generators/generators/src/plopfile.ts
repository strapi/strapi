import pluralize from 'pluralize';
import { NodePlopAPI } from 'plop';

import generateApi from './plops/api';
import generateController from './plops/controller';
import generateContentType from './plops/content-type';
import generatePolicy from './plops/policy';
import generateMiddleware from './plops/middleware';
import generateMigration from './plops/migration';
import generateService from './plops/service';

export default (plop: NodePlopAPI) => {
  // Plop config
  plop.setWelcomeMessage('Strapi Generators');
  plop.addHelper('pluralize', (text: string) => pluralize(text));

  // Generators
  generateApi(plop);
  generateController(plop);
  generateContentType(plop);
  generatePolicy(plop);
  generateMiddleware(plop);
  generateMigration(plop);
  generateService(plop);
};
