import { has } from 'lodash/fp';
import type { Core, Internal, Public } from '@strapi/types';

const componentsRegistry = () => {
  const components: Record<Public.UID.Component, Internal.Struct.ComponentSchema> = {};

  return {
    /**
     * Returns this list of registered components uids
     */
    keys(): Public.UID.Component[] {
      return Object.keys(components) as Public.UID.Component[];
    },

    /**
     * Returns the instance of a component. Instantiate the component if not already done
     */
    get(uid: Public.UID.Component) {
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
    set(uid: Public.UID.Component, component: Internal.Struct.ComponentSchema) {
      if (has(uid, components)) {
        throw new Error(`Component ${uid} has already been registered.`);
      }

      components[uid] = component;

      return this;
    },

    /**
     * Registers a map of components for a specific namespace
     */
    add(newComponents: Record<Public.UID.Component, Internal.Struct.ComponentSchema>) {
      for (const uid of Object.keys(newComponents) as Public.UID.Component[]) {
        this.set(uid, newComponents[uid]);
      }
    },
  };
};

export default componentsRegistry;
