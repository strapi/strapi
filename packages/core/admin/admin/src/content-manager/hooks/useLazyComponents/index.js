import { useEffect, useState } from 'react';
import { useCustomFields } from '@strapi/helper-plugin';

const componentStore = new Map();

/**
 * @description
 * A hook to lazy load custom field components
 * @param {Array.<string>} componentUids - The uids to look up components
 * @returns object
 */
const useLazyComponents = (componentUids = []) => {
  const [lazyComponentStore, setLazyComponentStore] = useState(Object.fromEntries(componentStore));
  const [loading, setLoading] = useState(componentStore.size === 0);
  const customFieldsRegistry = useCustomFields();

  useEffect(() => {
    const setStore = (store) => {
      setLazyComponentStore(store);
      setLoading(false);
    };

    const lazyLoadComponents = async (uids, components) => {
      const modules = await Promise.all(components);

      const internalStore = {};

      uids.forEach((uid, index) => {
        componentStore.set(uid, modules[index].default);
        internalStore[uid] = modules[index].default;
      });

      setStore(internalStore);
    };

    if (componentUids.length && loading) {
      /**
       * These uids are not in the component store therefore we need to get the components
       */
      const newUids = componentUids.filter((uid) => !componentStore.get(uid));

      const componentPromises = newUids.map((uid) => {
        const customField = customFieldsRegistry.get(uid);

        return customField.components.Input();
      });

      if (componentPromises.length > 0) {
        lazyLoadComponents(newUids, componentPromises);
      } else {
        const store = Object.fromEntries(componentStore);
        setStore(store);
      }
    }
  }, [componentUids, customFieldsRegistry, loading]);

  return { isLazyLoading: loading, lazyComponentStore };
};

export default useLazyComponents;
