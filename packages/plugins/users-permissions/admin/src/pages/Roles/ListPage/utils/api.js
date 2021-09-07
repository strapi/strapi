import { getRequestURL, axiosInstance } from '../../../../utils';

// eslint-disable-next-line import/prefer-default-export
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
