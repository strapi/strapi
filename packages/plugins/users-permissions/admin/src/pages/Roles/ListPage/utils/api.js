import { getRequestURL, axiosInstance } from '../../../../utils';

export const fetchData = async toggleNotification => {
  try {
    const { data } = await axiosInstance.get(getRequestURL('roles'));

    return data;
  } catch (err) {
    toggleNotification({
      type: 'warning',
      message: { id: 'notification.error' },
    });

    throw new Error('error');
  }
};
