import type { Plugin, Struct } from '@strapi/types';
import { contentTypes as contentTypesUtils } from '@strapi/utils';
import { get } from 'lodash';

import { controllers } from './controllers';
import { services } from './services';
import { routes } from './routes';
import { POSITION_ATTRIBUTE } from './constants';
import { getService, isFeatureEnabled } from './utils';

/**
 * Custom order can be turned on for any collection type listed in the Content Manager.
 */
const isOrderable = (contentType: Struct.ContentTypeSchema) =>
  contentTypesUtils.isCollectionType(contentType) &&
  get(contentType, 'pluginOptions.content-manager.visible', true) === true;

/**
 * The future flag is read when the server starts rather than when this module is loaded,
 * so the controllers, services and routes are always there and do nothing while it is off.
 */
const feature: Partial<Plugin.LoadedPlugin> = {
  register({ strapi }) {
    if (!isFeatureEnabled(strapi)) {
      return;
    }

    /**
     * The setting is changed at runtime, while columns are only created when the server
     * starts, so every content type that could be ordered needs the attribute up front.
     */
    for (const contentType of Object.values(strapi.contentTypes)) {
      if (!isOrderable(contentType)) {
        continue;
      }

      strapi.get('content-types').extend(contentType.uid, (schema: Struct.ContentTypeSchema) => {
        Object.assign(schema.attributes, {
          [POSITION_ATTRIBUTE]: {
            type: 'integer',
            configurable: false,
            visible: false,
            // Needed for the Content Manager to sort on it, the value itself is only ever
            // written by moving a document
            writable: true,
            private: true,
          },
        });
      });
    }
  },
  async bootstrap({ strapi }) {
    if (!isFeatureEnabled(strapi)) {
      return;
    }

    await getService(strapi, 'custom-order').bootstrap();
  },
  controllers,
  services,
  routes,
};

export default feature;
