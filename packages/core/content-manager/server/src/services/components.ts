import { isNil, mapValues } from 'lodash/fp';

import type { UID, Struct, Core } from '@strapi/types';
import type { Configuration } from '../../../shared/contracts/content-types';
import type { ConfigurationUpdate } from './configuration';

import { getService } from '../utils';
import storeUtils from './utils/store';
import createConfigurationService from './configuration';

const STORE_KEY_PREFIX = 'components';

const configurationService = createConfigurationService({
  storeUtils,
  isComponent: true,
  prefix: STORE_KEY_PREFIX,
  getModels() {
    const { toContentManagerModel } = getService('data-mapper');

    return mapValues(toContentManagerModel, strapi.components);
  },
});

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  findAllComponents() {
    const { toContentManagerModel } = getService('data-mapper');

    return Object.values(strapi.components).map(toContentManagerModel);
  },

  findComponent(uid: UID.Component) {
    const { toContentManagerModel } = getService('data-mapper');

    const component = strapi.components[uid];

    return isNil(component) ? component : toContentManagerModel(component);
  },

  async findConfiguration(component: Struct.ComponentSchema) {
    const configuration: Configuration = await configurationService.getConfiguration(component.uid);

    return {
      uid: component.uid,
      category: component.category,
      ...configuration,
    };
  },

  async updateConfiguration(
    component: Struct.ComponentSchema,
    newConfiguration: ConfigurationUpdate
  ) {
    await configurationService.setConfiguration(component.uid, newConfiguration);

    return this.findConfiguration(component);
  },

  /**
   * Batch load component configurations.
   *
   * Collects all component UIDs upfront, then loads configurations in a single
   * batch query instead of sequential queries per component.
   */
  async findComponentsConfigurations(model: Struct.ComponentSchema) {
    // Cache on request state so the same request can reuse configs
    const requestState = strapi.requestContext?.get?.()?.state as
      | { __componentsConfigurationsCache?: Map<string, Record<string, Configuration>> }
      | undefined;
    const requestCache = requestState?.__componentsConfigurationsCache;

    const componentUids = new Set<UID.Component>();

    const collectComponentUids = (schema: Struct.ComponentSchema) => {
      for (const key of Object.keys(schema.attributes)) {
        const attribute = schema.attributes[key];

        if (attribute.type === 'component') {
          const uid = attribute.component;
          if (!componentUids.has(uid)) {
            componentUids.add(uid);
            const nestedComponent = this.findComponent(uid);
            if (nestedComponent) {
              collectComponentUids(nestedComponent);
            }
          }
        }

        if (attribute.type === 'dynamiczone') {
          for (const uid of attribute.components) {
            if (!componentUids.has(uid)) {
              componentUids.add(uid);
              const nestedComponent = this.findComponent(uid);
              if (nestedComponent) {
                collectComponentUids(nestedComponent);
              }
            }
          }
        }
      }
    };

    collectComponentUids(model);

    if (componentUids.size === 0) {
      return {};
    }

    // Key format must match configuration.ts uidToStoreKey: `${prefix}::${uid}`
    const uidsArray = Array.from(componentUids);
    const prefixedKeys = uidsArray.map((uid) => `components::${uid}`);
    const cacheKey = prefixedKeys.slice().sort().join('|');
    if (requestCache?.has(cacheKey)) {
      return requestCache.get(cacheKey)! as Record<
        string,
        Configuration & { category: string; isComponent: boolean }
      >;
    }

    const configs = await storeUtils.getModelConfigurations(prefixedKeys);

    const componentsMap: Record<
      string,
      Configuration & { category: string; isComponent: boolean }
    > = {};

    for (const uid of uidsArray) {
      const component = this.findComponent(uid);
      const configKey = `components::${uid}`;
      // Fallback must include proper layouts structure for frontend compatibility
      const configuration = configs[configKey] || {
        settings: {},
        metadatas: {},
        layouts: { list: [], edit: [] },
      };

      componentsMap[uid] = {
        uid: component.uid,
        category: component.category,
        ...configuration,
      };
    }

    if (requestState) {
      if (!requestState.__componentsConfigurationsCache) {
        requestState.__componentsConfigurationsCache = new Map();
      }
      requestState.__componentsConfigurationsCache.set(cacheKey, componentsMap);
    }

    return componentsMap;
  },

  syncConfigurations() {
    return configurationService.syncConfigurations();
  },
});
