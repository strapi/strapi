import { ComponentType, useCallback, useEffect, useState } from 'react';

import { CustomField, CustomFieldUID, useCustomFields } from '@strapi/helper-plugin';

const componentStore = new Map<CustomFieldUID, ComponentType | undefined>();

/**
 * @description A hook to lazy load custom field components
 */
const useLazyComponents = (componentUids: CustomFieldUID[] = []) => {
  const [lazyComponentStore, setLazyComponentStore] = useState(Object.fromEntries(componentStore));
  /**
   * Start loading only if there are any components passed in
   * and there are some new to load
   */
  const newUids = componentUids.filter((uid) => !componentStore.get(uid));
  const [loading, setLoading] = useState(() => !!newUids.length);
  const customFieldsRegistry = useCustomFields();

  useEffect(() => {
    const setStore = (store: Record<string, ComponentType | undefined>) => {
      setLazyComponentStore(store);
      setLoading(false);
    };

    const lazyLoadComponents = async (
      uids: CustomFieldUID[],
      components: Array<ReturnType<CustomField['components']['Input']>>
    ) => {
      const modules = await Promise.all(components);

      uids.forEach((uid, index) => {
        componentStore.set(uid, modules[index].default);
      });

      setStore(Object.fromEntries(componentStore));
    };

    if (newUids.length > 0) {
      setLoading(true);

      const componentPromises = newUids.reduce<
        Array<ReturnType<CustomField['components']['Input']>>
      >((arrayOfPromises, uid) => {
        const customField = customFieldsRegistry.get(uid);

        if (customField) {
          arrayOfPromises.push(customField.components.Input());
        }

        return arrayOfPromises;
      }, []);

      if (componentPromises.length > 0) {
        lazyLoadComponents(newUids, componentPromises);
      }
    }
  }, [newUids, customFieldsRegistry]);

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

export { useLazyComponents };
