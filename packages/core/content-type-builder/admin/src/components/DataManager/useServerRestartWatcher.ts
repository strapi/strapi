import { useFetchClient } from '@strapi/admin/strapi-admin';

const SERVER_HAS_BEEN_KILLED_MESSAGE = 'server is down';
const TIMEOUT = 'timeout';

const timeout = 10000;

export const useServerRestartWatcher = () => {
  const { get } = useFetchClient();

  const serverRestartWatcher = async (initTime?: number) => {
    const startTime = initTime ?? Date.now();

    if (Date.now() - startTime > timeout) {
      throw new Error(TIMEOUT);
    }

    try {
      const res = await get(`/content-type-builder/update-schema-status`);

      if (res.status && res.status >= 400) {
        throw new Error(SERVER_HAS_BEEN_KILLED_MESSAGE);
      }

      if (res?.data?.data?.isUpdating === true) {
        return new Promise((resolve) => {
          setTimeout(() => {
            return serverRestartWatcher(startTime).then(resolve);
          }, 100);
        });
      }
    } catch (err) {
      return new Promise((resolve) => {
        setTimeout(() => {
          return serverRestartWatcher(startTime).then(resolve);
        }, 100);
      });
    }
  };

  return serverRestartWatcher;
};
