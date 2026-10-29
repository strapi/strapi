import type { Core } from '@strapi/types';
import type { Controllers } from '../types/controllers';
import homepage from './homepage';
import release from './release';
import releaseAction from './release-action';
import settings from './settings';

// `homepage` is a factory: the registry calls it with `{ strapi }`. It is checked in `./homepage`
// against its registered contract.
export const controllers = {
  homepage,
  release,
  'release-action': releaseAction,
  settings,
} satisfies Omit<Controllers, 'homepage'> & { homepage: unknown };

// The registered names match the map.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ControllerNames = Core.Assert<
  Core.SameNames<
    keyof typeof controllers,
    keyof Core.RegisteredFor<Strapi.Registries.PackageControllers, 'plugin::content-releases'>
  >
>;
