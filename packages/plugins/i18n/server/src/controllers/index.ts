import type { Core } from '@strapi/types';
import locales from './locales';
import contentTypes from './content-types';
import isoLocales from './iso-locales';
import settings from './settings';
import aiLocalizationJobs from './ai-localization-jobs';

type Controllers = {
  [TUID in keyof Strapi.Registries.PackageControllers as TUID extends `plugin::i18n.${infer TName}`
    ? TName
    : never]:
    | Strapi.Registries.PackageControllers[TUID]
    | ((params: { strapi: Core.Strapi }) => Strapi.Registries.PackageControllers[TUID]);
};

const controllers = {
  locales,
  'iso-locales': isoLocales,
  'content-types': contentTypes,
  settings,
  'ai-localization-jobs': aiLocalizationJobs,
} satisfies Controllers;

export default controllers;
