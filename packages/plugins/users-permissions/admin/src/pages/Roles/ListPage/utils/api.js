import { getFetchClient } from '@strapi/admin/admin/src/utils/getFetchClient';
import { getRequestURL } from '../../../../utils';

export const fetchData = async (toggleNotification, notifyStatus) => {
  const { get } = getFetchClient();
  try {
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
  const { del } = getFetchClient();
  try {
    await del(`${getRequestURL('roles')}/${id}`);
  } catch (error) {
    toggleNotification({
      type: 'warning',
      message: { id: 'notification.error', defaultMessage: 'An error occured' },
    });
  }
};
