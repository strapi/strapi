import type { Core } from '@strapi/types';
import type { Services } from '../types';

import * as contentTypes from './content-types';
import * as components from './components';
import * as componentCategories from './component-categories';
import * as builder from './builder';
import * as apiHandler from './api-handler';
import * as schema from './schema';
import { createContentStructureService } from './content-structure';

/** Names of the registered Content-Type Builder services. */
type RegisteredNames = keyof Core.RegisteredFor<
  Strapi.Registries.PackageServices,
  'plugin::content-type-builder'
>;

export default {
  'content-types': contentTypes satisfies Services['content-types'],
  components,
  'component-categories': componentCategories satisfies Services['component-categories'],
  builder: builder satisfies Services['builder'],
  'api-handler': apiHandler satisfies Services['api-handler'],
  schema,
  'content-structure': (({ strapi }: { strapi: Core.Strapi }) =>
    createContentStructureService(
      strapi
    )) satisfies Core.ServiceFactory<'plugin::content-type-builder.content-structure'>,
} satisfies Record<RegisteredNames, unknown>;
