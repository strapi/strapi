import { has } from 'lodash/fp';
import type { Struct, UID } from '@strapi/types';

const componentsRegistry = () => {
  const components: Record<UID.Component, Struct.ComponentSchema> = {};

  return {
    /**
     * Returns this list of registered components uids
     */
    keys(): UID.Component[] {
      return Object.keys(components) as UID.Component[];
    },

    /**
     * Returns the instance of a component. Instantiate the component if not already done
     */
    get(uid: UID.Component) {
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
    set(uid: UID.Component, component: Struct.ComponentSchema, options?: { force?: boolean }) {
      if (has(uid, components) && !options?.force) {
        throw new Error(`Component ${uid} has already been registered.`);
      }

      components[uid] = component;

      return this;
    },

    /**
     * Registers a map of components for a specific namespace
     */
    add(
      newComponents: Record<UID.Component, Struct.ComponentSchema>,
      options?: { force?: boolean }
    ) {
      for (const uid of Object.keys(newComponents) as UID.Component[]) {
        this.set(uid, newComponents[uid], { force: options?.force });
      }
    },

    /**
     * Removes all components (used for rebuilding from disk)
     */
    clear() {
      for (const uid of Object.keys(components) as UID.Component[]) {
        delete components[uid];
      }
      return this;
    },
  };
};

export default componentsRegistry;
