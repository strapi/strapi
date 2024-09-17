import { hooks } from '@strapi/utils';

import { defineProvider } from './provider';
import * as registries from '../registries';
import { loadApplicationContext } from '../loaders';
import * as syncMigrations from '../migrations';
import { discardDocumentDrafts } from '../migrations/database/5.0.0-discard-drafts';

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

    // Content migration to enable draft and publish
    strapi.hook('strapi::content-types.beforeSync').register(syncMigrations.disable);
    strapi.hook('strapi::content-types.afterSync').register(syncMigrations.enable);

    // Database migrations
    strapi.db.migrations.providers.internal.register(discardDocumentDrafts);
  },
});
