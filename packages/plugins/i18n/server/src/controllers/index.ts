import locales from './locales';
import contentTypes from './content-types';
import isoLocales from './iso-locales';
import settings from './settings';
import aiLocalizationJobs from './ai-localization-jobs';

import type {} from '../types';

/** Names of the registered i18n controllers. */
type RegisteredNames = keyof Strapi.Registries.PackageControllers extends infer TUID
  ? TUID extends `plugin::i18n.${infer TName}`
    ? TName
    : never
  : never;

// Every registered controller has an implementation. Only the names are checked: the implementations keep
// their published develop types, which the registered contracts refine.
export default {
  locales,
  'iso-locales': isoLocales,
  'content-types': contentTypes,
  settings,
  'ai-localization-jobs': aiLocalizationJobs,
} satisfies Record<RegisteredNames, unknown>;
