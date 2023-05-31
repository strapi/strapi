import { getFetchClient } from '@strapi/helper-plugin';
import { getRequestURL } from '../../../../utils';

export const fetchData = async (toggleNotification, notifyStatus) => {
  try {
    const { get } = getFetchClient();
    const { data } = await get(getRequestURL('roles'));
    notifyStatus('The roles have loaded successfully');

    return data;
  } catch (err) {
    toggleNotification({
      type: 'warning',
      message: { id: 'notification.error' },
    });

    throw new Error('error');
  }
};

export const deleteData = async (id, toggleNotification) => {
  try {
    const { del } = getFetchClient();
    await del(`${getRequestURL('roles')}/${id}`);
  } catch (error) {
    toggleNotification({
      type: 'warning',
      message: { id: 'notification.error', defaultMessage: 'An error occured' },
    });
  }
};
