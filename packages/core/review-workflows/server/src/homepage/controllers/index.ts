import type { Plugin } from '@strapi/types';
import { createHomepageController } from './homepage';

// `homepage` is a factory: the registry calls it with `{ strapi }`. It is checked in `./homepage`
// against its registered contract.
export const controllers: Plugin.LoadedPlugin['controllers'] = {
  homepage: createHomepageController,
};
