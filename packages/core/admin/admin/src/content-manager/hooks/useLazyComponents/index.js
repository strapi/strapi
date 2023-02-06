import { useCallback, useEffect, useState } from 'react';
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
  /**
   * Start loading only if there are any components passed in
   * and there are some new to load
   */
  const [newUids] = useState(() => componentUids.filter((uid) => !componentStore.get(uid)));
  const [loading, setLoading] = useState(() => !!newUids.length);

  const customFieldsRegistry = useCustomFields();

  useEffect(() => {
    const setStore = (store) => {
      setLazyComponentStore(store);
      setLoading(false);
    };

    const lazyLoadComponents = async (uids, components) => {
      const modules = await Promise.all(components);

      uids.forEach((uid, index) => {
        componentStore.set(uid, modules[index].default);
      });

      setStore(Object.fromEntries(componentStore));
    };

    if (loading) {
      /**
       * These uids are not in the component store therefore we need to get the components
       */
      const componentPromises = newUids.map((uid) => {
        const customField = customFieldsRegistry.get(uid);

        return customField.components.Input();
      });

      lazyLoadComponents(newUids, componentPromises);
    }
  }, [newUids, customFieldsRegistry, loading]);

  /**
   * Wrap this in a callback so it can be used in
   * effects to cleanup the cached store if required
   */
  const cleanup = useCallback(() => {
    componentStore.clear();
    setLazyComponentStore({});
  }, []);

  return { isLazyLoading: loading, lazyComponentStore, cleanup };
};

export default useLazyComponents;
