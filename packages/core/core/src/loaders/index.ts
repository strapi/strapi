import type { Core } from '@strapi/types';

import loadSrcIndex from './src-index';
import loadAPIs from './apis';
import loadMiddlewares from './middlewares';
import loadComponents from './components';
import loadPolicies from './policies';
import loadPlugins from './plugins';
import loadSanitizers from './sanitizers';
import loadValidators from './validators';

export async function loadApplicationContext(strapi: Core.Strapi) {
  await Promise.all([
    loadSrcIndex(strapi),
    loadSanitizers(strapi),
    loadValidators(strapi),
    loadPlugins(strapi),
    loadAPIs(strapi),
    loadComponents(strapi),
    loadMiddlewares(strapi),
    loadPolicies(strapi),
  ]);
}
