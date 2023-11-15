import { has, isNil, mapValues } from 'lodash/fp';

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

export default ({ strapi }: any) => ({
  findAllComponents() {
    const { toContentManagerModel } = getService('data-mapper');

    return Object.values(strapi.components).map(toContentManagerModel);
  },

  findComponent(uid: any) {
    const { toContentManagerModel } = getService('data-mapper');

    const component = strapi.components[uid];

    return isNil(component) ? component : toContentManagerModel(component);
  },

  // configuration

  async findConfiguration(component: any) {
    const configuration = await configurationService.getConfiguration(component.uid);

    return {
      uid: component.uid,
      category: component.category,
      ...configuration,
    };
  },

  async updateConfiguration(component: any, newConfiguration: any) {
    await configurationService.setConfiguration(component.uid, newConfiguration);

    return this.findConfiguration(component);
  },

  async findComponentsConfigurations(model: any) {
    const componentsMap = {};

    const getComponentConfigurations = async (uid: any) => {
      const component = this.findComponent(uid);

      if (has(uid, componentsMap)) return;

      const componentConfiguration = await this.findConfiguration(component);
      const componentsConfigurations = await this.findComponentsConfigurations(component);

      Object.assign(componentsMap, {
        [uid]: componentConfiguration,
        ...componentsConfigurations,
      });
    };

    for (const key of Object.keys(model.attributes)) {
      const attribute = model.attributes[key];

      if (attribute.type === 'component') {
        await getComponentConfigurations(attribute.component);
      }

      if (attribute.type === 'dynamiczone') {
        for (const componentUid of attribute.components) {
          await getComponentConfigurations(componentUid);
        }
      }
    }

    return componentsMap;
  },

  syncConfigurations() {
    return configurationService.syncConfigurations();
  },
});
