import type { Core } from '@strapi/types';
import locales from './locales';
import contentTypes from './content-types';
import isoLocales from './iso-locales';
import settings from './settings';
import aiLocalizationJobs from './ai-localization-jobs';

import type {} from '../types';

/** Names of the registered i18n controllers. */
type RegisteredNames = keyof Core.RegisteredFor<
  Strapi.Registries.PackageControllers,
  'plugin::i18n'
>;

// Every registered controller has an implementation. Only the names are checked: the implementations keep
// their published develop types, which the registered contracts refine.
export default {
  locales,
  'iso-locales': isoLocales,
  'content-types': contentTypes,
  settings,
  'ai-localization-jobs': aiLocalizationJobs,
} satisfies Record<RegisteredNames, unknown>;
