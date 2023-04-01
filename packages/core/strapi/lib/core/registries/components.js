'use strict';

const { pickBy, has } = require('lodash/fp');
const { createComponent } = require('../domain/component');
const { hasNamespace, addNamespace } = require('../utils');

const validateKeySameToSingularName = (components) => {
  for (const cName of Object.keys(components)) {
    const component = components[cName];

    if (cName !== component.schema.info.singularName) {
      throw new Error(
        `The key of the component should be the same as its singularName. Found ${cName} and ${component.schema.info.singularName}.`
      );
    }
  }
};

const componentsRegistry = () => {
  const components = {};

  return {
    /**
     * Returns this list of registered components uids
     * @returns {string[]}
     */
    keys() {
      return Object.keys(components);
    },

    /**
     * Returns the instance of a component. Instantiate the component if not already done
     * @param {string} uid
     * @returns
     */
    get(uid) {
      return components[uid];
    },

    /**
     * Returns a map with all the components in a namespace
     * @param {string} namespace
     */
    getAll(namespace) {
      return pickBy((_, uid) => hasNamespace(uid, namespace))(components);
    },

    /**
     * Registers a component
     * @param {string} uid
     * @param {Object} component
     */
    set(uid, component) {
      components[uid] = component;
      return this;
    },

    /**
     * Registers a map of components for a specific namespace
     * @param {string} namespace
     * @param {{ [key: string]: Object }} newComponents
     */
    add(namespace, newComponents) {
      validateKeySameToSingularName(newComponents);

      for (const rawComponentName of Object.keys(newComponents)) {
        const uid = addNamespace(rawComponentName, namespace);

        if (has(uid, components)) {
          throw new Error(`Component ${uid} has already been registered.`);
        }

        components[uid] = createComponent(uid, newComponents[rawComponentName]);
      }
    },

    /**
     * Wraps a component to extend it
     * @param {string} uid
     * @param {(component: Object) => Object} extendFn
     */
    extend(cUID, extendFn) {
      const currentComponent = this.get(cUID);

      if (!currentComponent) {
        throw new Error(`Component ${cUID} doesn't exist`);
      }

      const newComponent = extendFn(currentComponent);
      components[cUID] = newComponent;

      return this;
    },
  };
};

module.exports = componentsRegistry;
