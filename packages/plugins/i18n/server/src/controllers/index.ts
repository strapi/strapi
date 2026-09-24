import locales from './locales';
import contentTypes from './content-types';
import isoLocales from './iso-locales';
import settings from './settings';
import aiLocalizationJobs from './ai-localization-jobs';

const controllers = {
  locales,
  'iso-locales': isoLocales,
  'content-types': contentTypes,
  settings,
  'ai-localization-jobs': aiLocalizationJobs,
} as const;

export default controllers;
