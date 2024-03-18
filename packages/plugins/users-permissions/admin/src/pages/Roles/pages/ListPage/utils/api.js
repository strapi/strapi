import { getFetchClient } from '@strapi/helper-plugin';

export const fetchData = async (toggleNotification, formatMessage, notifyStatus) => {
  try {
    const { get } = getFetchClient();
    const { data } = await get('/users-permissions/roles');
    notifyStatus('The roles have loaded successfully');

    return data;
  } catch (err) {
    toggleNotification({
      type: 'danger',
      message: formatMessage({ id: 'notification.error' }),
    });

    throw new Error(err);
  }
};

export const deleteData = async (id, formatMessage, toggleNotification) => {
  try {
    const { del } = getFetchClient();
    await del(`/users-permissions/roles/${id}`);
  } catch (error) {
    toggleNotification({
      type: 'danger',
      message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occured' }),
    });
  }
};
