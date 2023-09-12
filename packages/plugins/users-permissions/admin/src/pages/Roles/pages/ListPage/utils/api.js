import { getFetchClient } from '@strapi/helper-plugin';

export const fetchData = async (toggleNotification, notifyStatus) => {
  try {
    const { get } = getFetchClient();
    const { data } = await get('/users-permissions/roles');
    notifyStatus('The roles have loaded successfully');

    return data;
  } catch (err) {
    toggleNotification({
      type: 'warning',
      message: { id: 'notification.error' },
    });

    throw new Error(err);
  }
};

export const deleteData = async (id, toggleNotification) => {
  try {
    const { del } = getFetchClient();
    await del(`/users-permissions/roles/${id}`);
  } catch (error) {
    toggleNotification({
      type: 'warning',
      message: { id: 'notification.error', defaultMessage: 'An error occured' },
    });
  }
};
