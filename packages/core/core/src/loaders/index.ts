import type { Core } from '@strapi/types';

import loadSrcIndex, { readSrcIndex } from './src-index';
import loadAPIs from './apis';
import loadMiddlewares from './middlewares';
import loadComponents from './components';
import loadPolicies from './policies';
import loadPlugins from './plugins';
import loadSanitizers from './sanitizers';
import loadValidators from './validators';

import { isAppDefinition } from '../app-definition/brand';
import { getAppDefinition, setAppDefinition } from '../app-definition/context';
import { runProgrammaticLoaders } from '../app-definition/load';

export async function loadApplicationContext(strapi: Core.Strapi) {
  let app = getAppDefinition(strapi);

  // Safety net: a `strapi start` whose compiled `src/index.js` default-exports a
  // `defineApp(...)` result is treated as programmatic even if the CLI did not
  // pre-detect it. (The CLI path additionally threads `app.config` through
  // STAGE 1; this fallback covers content/routes/plugins only.)
  if (!app) {
    const srcModule = readSrcIndex(strapi.dirs.dist.src);
    if (isAppDefinition(srcModule)) {
      setAppDefinition(strapi, srcModule);
      app = srcModule;
    }
  }

  // Programmatic mode: the definition is the source of truth and each resource
  // is resolved independently (in-code value or `fromDisk(path)`).
  if (app) {
    await runProgrammaticLoaders(strapi, app);
    return;
  }

  // Legacy mode: unchanged — disk loaders read src/api/**, config/**, etc.
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
