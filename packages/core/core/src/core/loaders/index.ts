import type { Strapi } from '@strapi/types';

import loadSrcIndex from './src-index';
import loadAPIs from './apis';
import loadMiddlewares from './middlewares';
import loadComponents from './components';
import loadPolicies from './policies';
import loadPlugins from './plugins';
import loadAdmin from './admin';
import loadSanitizers from './sanitizers';
import loadValidators from './validators';

export async function loadApplicationContext(strapi: Strapi) {
  await Promise.all([
    loadSrcIndex(strapi),
    loadSanitizers(strapi),
    loadValidators(strapi),
    loadPlugins(strapi),
    loadAdmin(strapi),
    loadAPIs(strapi),
    loadComponents(strapi),
    loadMiddlewares(strapi),
    loadPolicies(strapi),
  ]);
}
