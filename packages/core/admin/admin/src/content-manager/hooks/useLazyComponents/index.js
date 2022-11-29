import { useEffect, useState } from 'react';
import { useCustomFields } from '@strapi/helper-plugin';

/**
 * @description
 * A hook to lazy load custom field components
 * @param {Array.<string>} componentUids - The uids to look up components
 * @returns object
 */
const useLazyComponents = (componentUids) => {
  const [lazyComponentStore, setLazyComponentStore] = useState({});
  const [loading, setLoading] = useState(true);
  const customFieldsRegistry = useCustomFields();

  useEffect(() => {
    const lazyLoadComponents = async (uids, components) => {
      const modules = await Promise.all(components);

      uids.forEach((uid, index) => {
        if (!Object.keys(lazyComponentStore).includes(uid)) {
          setLazyComponentStore({ ...lazyComponentStore, [uid]: modules[index].default });
        }
      });
    };

    if (componentUids.length) {
      const componentPromises = componentUids.map((uid) => {
        const customField = customFieldsRegistry.get(uid);

        return customField.components.Input();
      });

      lazyLoadComponents(componentUids, componentPromises);
    }

    if (componentUids.length === Object.keys(lazyComponentStore).length) {
      setLoading(false);
    }
  }, [componentUids, customFieldsRegistry, loading, lazyComponentStore]);

  return { isLazyLoading: loading, lazyComponentStore };
};

export default useLazyComponents;
