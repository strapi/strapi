import { getFetchClient } from '@strapi/helper-plugin';

// eslint-disable-next-line import/prefer-default-export
export const fetchData = async (toggleNotification) => {
  try {
    const { get } = getFetchClient();
    const { data } = await get('/users-permissions/providers');

    return data;
  } catch (err) {
    toggleNotification({
      type: 'warning',
      message: { id: 'notification.error' },
    });

    throw new Error('error');
  }
};

export const putProvider = (body) => {
  const { put } = getFetchClient();

  return put('/users-permissions/providers', body);
};
