import { has } from 'lodash/fp';
import type { Common, Schema } from '@strapi/types';

const componentsRegistry = () => {
  const components: Record<Common.UID.Component, Schema.Component> = {};

  return {
    /**
     * Returns this list of registered components uids
     */
    keys(): Common.UID.Component[] {
      return Object.keys(components) as Common.UID.Component[];
    },

    /**
     * Returns the instance of a component. Instantiate the component if not already done
     */
    get(uid: Common.UID.Component) {
      return components[uid];
    },

    /**
     * Returns a map with all the components in a namespace
     */
    getAll() {
      return components;
    },

    /**
     * Registers a component
     */
    set(uid: Common.UID.Component, component: Schema.Component) {
      if (has(uid, components)) {
        throw new Error(`Component ${uid} has already been registered.`);
      }

      components[uid] = component;

      return this;
    },

    /**
     * Registers a map of components for a specific namespace
     */
    add(newComponents: Record<Common.UID.Component, Schema.Component>) {
      for (const uid of Object.keys(newComponents) as Common.UID.Component[]) {
        this.set(uid, newComponents[uid]);
      }
    },
  };
};

export default componentsRegistry;
