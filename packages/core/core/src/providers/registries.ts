import { hooks } from '@strapi/utils';

import { defineProvider } from './provider';
import * as registries from '../registries';
import { loadApplicationContext } from '../loaders';
import * as draftAndPublishSync from '../migrations/draft-publish';

export default defineProvider({
  init(strapi) {
    strapi
      .add('content-types', () => registries.contentTypes())
      .add('components', () => registries.components())
      .add('services', () => registries.services(strapi))
      .add('policies', () => registries.policies())
      .add('middlewares', () => registries.middlewares())
      .add('hooks', () => registries.hooks())
      .add('controllers', () => registries.controllers(strapi))
      .add('modules', () => registries.modules(strapi))
      .add('plugins', () => registries.plugins(strapi))
      .add('custom-fields', () => registries.customFields(strapi))
      .add('apis', () => registries.apis(strapi))
      .add('models', () => registries.models())
      .add('sanitizers', registries.sanitizers())
      .add('validators', registries.validators());
  },
  async register(strapi) {
    await loadApplicationContext(strapi);

    strapi.get('hooks').set('strapi::content-types.beforeSync', hooks.createAsyncParallelHook());
    strapi.get('hooks').set('strapi::content-types.afterSync', hooks.createAsyncParallelHook());

    strapi.hook('strapi::content-types.beforeSync').register(draftAndPublishSync.disable);
    strapi.hook('strapi::content-types.afterSync').register(draftAndPublishSync.enable);
  },
});
