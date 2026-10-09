import type { Core } from '@strapi/types';

import * as contentTypes from './content-types';
import * as components from './components';
import * as componentCategories from './component-categories';
import * as builder from './builder';
import * as apiHandler from './api-handler';
import * as schema from './schema';
import { createContentStructureService } from './content-structure';

export default {
  'content-types': contentTypes,
  components,
  'component-categories': componentCategories,
  builder,
  'api-handler': apiHandler,
  schema,
  'content-structure': ({ strapi }: { strapi: Core.Strapi }) =>
    createContentStructureService(strapi),
};
