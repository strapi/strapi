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
