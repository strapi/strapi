import type { Core } from '@strapi/types';
import type {} from '../types';

import homepage from './homepage';
import release from './release';
import releaseAction from './release-action';
import releaseValidation from './validation';
import scheduling from './scheduling';
import settings from './settings';

/** Names of the registered Content Releases services. */
type RegisteredNames = keyof Core.RegisteredFor<
  Strapi.Registries.PackageServices,
  'plugin::content-releases'
>;

export const services = {
  homepage,
  release,
  'release-action': releaseAction,
  'release-validation': releaseValidation,
  scheduling,
  settings,
} satisfies Record<RegisteredNames, unknown>;
