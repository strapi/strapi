'use strict';

const _ = require('lodash');

const storeUtils = require('./utils/store');

const uidToStoreKey = uid => `components::${uid}`;

module.exports = {
  async getComponentInformations(uid) {
    const ctService = strapi.plugins['content-manager'].services['content-types'];

    const component = strapi.components[uid];

    const configurations = await this.getConfiguration(uid);

    return {
      component: {
        uid,
        category: component.category,
        schema: ctService.formatContentTypeSchema(component),
        ...configurations,
      },
      components: await this.getComponentsSchemas(component),
    };
  },

  async getComponentsSchemas(model) {
    const componentsMap = {};

    for (const key in model.attributes) {
      const attr = model.attributes[key];

      if (!['component', 'dynamiczone'].includes(attr.type)) continue;

      if (attr.type === 'component') {
        const compo = strapi.components[attr.component];

        if (_.has(componentsMap, compo.uid)) continue;

        const { component, components } = await this.getComponentInformations(compo.uid);

        Object.assign(componentsMap, {
          [compo.uid]: component,
          ...components,
        });
      }

      if (attr.type === 'dynamiczone') {
        const componentKeys = attr.components;

        for (const componentKey of componentKeys) {
          const compo = strapi.components[componentKey];

          if (_.has(componentsMap, compo.uid)) continue;

          const { component, components } = await this.getComponentInformations(compo.uid);

          Object.assign(componentsMap, {
            [compo.uid]: component,
            ...components,
          });
        }
      }
    }

    return componentsMap;
  },

  getConfiguration(uid) {
    const storeKey = uidToStoreKey(uid);
    return storeUtils.getModelConfiguration(storeKey);
  },

  setConfiguration(uid, input) {
    const { settings, metadatas, layouts } = input;

    const storeKey = uidToStoreKey(uid);
    return storeUtils.setModelConfiguration(storeKey, {
      uid,
      isComponent: true,
      settings,
      metadatas,
      layouts,
    });
  },

  deleteConfiguration(uid) {
    const storeKey = uidToStoreKey(uid);
    return storeUtils.deleteKey(storeKey);
  },
};
