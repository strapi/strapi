import { useFetchClient } from '@strapi/admin/strapi-admin';

const TIMEOUT = 'timeout';

const timeout = 30 * 1000;

export const useServerRestartWatcher = () => {
  const { get } = useFetchClient();

  const serverRestartWatcher = async (initTime?: number) => {
    const startTime = initTime ?? Date.now();

    if (Date.now() - startTime > timeout) {
      throw new Error(TIMEOUT);
    }

    try {
      const res = await get(`/content-type-builder/update-schema-status`);

      if (res?.data?.data?.isUpdating === true) {
        return new Promise((resolve) => {
          setTimeout(() => {
            return serverRestartWatcher(startTime).then(resolve);
          }, 200);
        });
      }

      // Add a small delay after restart completion to ensure middleware stabilization
      // This prevents MIME type conflicts from race conditions during route registration
      return new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
    } catch (err) {
      return new Promise((resolve) => {
        setTimeout(() => {
          return serverRestartWatcher(startTime).then(resolve);
        }, 200);
      });
    }
  };

  return serverRestartWatcher;
};
